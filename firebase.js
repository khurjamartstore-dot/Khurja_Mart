// Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyADYm-thQUGoHHhrcLnnw1ksupscAfv0cY",
    authDomain: "khurja-mart.firebaseapp.com",
    projectId: "khurja-mart",
    storageBucket: "khurja-mart.firebasestorage.app",
    messagingSenderId: "284466808761",
    appId: "1:284466808761:web:c5832a24cefb827352d868",
    measurementId: "G-WWYK26T06C"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
  const auth = getAuth(app);
  const db = getFirestore(app);

window.currentUser = null;
onAuthStateChanged(auth, (user) => {
  window.currentUser = user || null;
  if (user) {
    document.getElementById("userInfo").style.display = "block";
    document.getElementById("userEmail").innerText = user.email;
    document.getElementById("loginRow").style.display = "none";
    if (typeof window.runPendingAuthAction === "function") window.runPendingAuthAction();
  } else {
    document.getElementById("userInfo").style.display = "none";
    document.getElementById("loginRow").style.display = "flex";
  }
});
function notify(msg){
  if (typeof window.showToast === "function") window.showToast(msg);
  else alert(msg);
}

window.signUpUser = async function () {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    notify("Email aur password dono bharein");
    return;
  }
  if (password.length < 6) {
    notify("Password kam se kam 6 characters ka ho");
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    notify("Sign Up Successful! 🎉");
    closeLogin();
  } catch (e) {
    notify(e.message);
  }
};

window.loginUser = async function () {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    notify("Email aur password dono bharein");
    return;
  }

  try {
    const rememberChk = document.getElementById("rememberMeChk");
    const remember = !rememberChk || rememberChk.checked;
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email, password);
    notify("Login Successful! 🎉");
    closeLogin();
  } catch (e) {
    notify(e.message);
  }
};

window.forgotPassword = async function () {
  const email = document.getElementById("loginEmail").value.trim();
  if (!email) {
    notify("Pehle apna email likhein, phir Forgot Password dabayein");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    notify("Password reset link email par bhej diya gaya ✅");
  } catch (e) {
    notify(e.message);
  }
};

window.socialLogin = async function (provider) {
  if (provider === "google") {
    try {
      const rememberChk = document.getElementById("rememberMeChk");
      const remember = !rememberChk || rememberChk.checked;
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      await signInWithPopup(auth, new GoogleAuthProvider());
      notify("Google se login ho gaya! 🎉");
      closeLogin();
    } catch (e) {
      notify(e.message);
    }
    return;
  }
  notify("Yeh option jaldi add hoga — abhi ke liye email se login/signup karein 🙂");
};
window.logoutUser = async function () {
  await signOut(auth);

  document.getElementById("userInfo").style.display = "none";
  document.getElementById("loginRow").style.display = "flex";
  document.getElementById("userEmail").innerText = "";
};

// ================= Product catalog (Firestore, real-time) =================
// Admin panel jo bhi product save karta hai (photo Cloudinary URL sahit),
// wo yahin "products" collection me aata hai. onSnapshot yahan lagataar
// (real-time) sunta rehta hai — jaise hi Firestore me kuch add/edit/delete
// hota hai, callback turant naya products array leke chalta hai, bina
// page refresh kiye.
window.subscribeToCatalog = function (callback) {
  const productsRef = collection(db, "products");
  onSnapshot(
    productsRef,
    (snapshot) => {
      const products = [];
      snapshot.forEach((d) => products.push(d.data()));
      callback(products);
    },
    (error) => {
      console.warn("Firestore real-time sync error:", error);
    }
  );
};

// script.js ko signal karo ki firebase.js ready ho chuki hai
window.dispatchEvent(new Event("firebaseReady"));
// Banners real-time — jaise hi admin panel se banner add/delete ho, website turant update
window.subscribeToBanners = function (callback) {
  onSnapshot(doc(db, "config", "banners"), (snap) => {
    callback(snap.exists() ? (snap.data().items || []) : []);
  }, (error) => {
    console.warn("Banner sync error:", error);
  });
};

// Categories real-time — admin panel se category add/edit/delete (photo sahit) turant website par
window.subscribeToCategories = function (callback) {
  onSnapshot(doc(db, "config", "categories"), (snap) => {
    callback(snap.exists() ? (snap.data().items || []) : []);
  }, (error) => {
    console.warn("Category sync error:", error);
  });
};

// Orders — website se place hote hi Firestore ki "orders" collection me save,
// taaki admin panel real-time me naya order dekh sake. Guest checkout bhi
// chalta hai (uid null rahega), login hone par uid/email order ke saath jud jaata hai.
window.saveOrderToFirestore = async function (order) {
  try {
    const user = window.currentUser;
    await addDoc(collection(db, "orders"), Object.assign({}, order, {
      uid: user ? user.uid : null,
      email: user ? user.email : null,
      status: "confirmed",
      createdAt: serverTimestamp()
    }));
    return true;
  } catch (error) {
    console.warn("Order save to Firestore failed:", error);
    return false;
  }
};

// Offers (flash sale + coupons) real-time — admin panel se save hote hi website par turant
window.subscribeToOffers = function (callback) {
  onSnapshot(doc(db, "config", "offers"), (snap) => {
    callback(snap.exists() ? snap.data() : {});
  }, (error) => {
    console.warn("Offers sync error:", error);
  });
};

// Reviews — admin panel se add hone par "reviews" collection me aate hain,
// yahan se real-time website par product detail page par dikhte hain.
window.subscribeToReviews = function (callback) {
  const reviewsRef = collection(db, "reviews");
  onSnapshot(
    reviewsRef,
    (snapshot) => {
      const reviews = [];
      snapshot.forEach((d) => reviews.push(d.data()));
      callback(reviews);
    },
    (error) => {
      console.warn("Reviews sync error:", error);
    }
  );
};