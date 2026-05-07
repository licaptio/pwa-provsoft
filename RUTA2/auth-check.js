const auth = firebase.auth();

document.body.style.display = "none";

auth.onAuthStateChanged(user => {

  // 🔒 SIN LOGIN
  if (!user) {

    window.location.replace("login.html");
    return;
  }

  // ✅ AUTENTICADO
  document.body.style.display = "block";

});
