function mostrarSenha(){
   var inputPass = document.getElementById('password')
   var btnShowPass = document.getElementById('mostrar')

   if(inputPass.type === 'password'){
      inputPass.setAttribute('type','text')
      btnShowPass.classList.replace('bi-eye','bi-eye-slash')
   }else{
      inputPass.setAttribute('type','password')
      btnShowPass.classList.replace('bi-eye-slash','bi-eye')
   }
}

document.getElementById('loginForm').onsubmit = async (event) => {
   event.preventDefault(); // Previne o envio padrão do formulário
   
   const formData = new FormData(event.target);
   const data = Object.fromEntries(formData);

   const response = await fetch('/login', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(data)
   });

   if (response.redirected) {
       // Se o servidor redirecionar, navegue para a nova URL
       window.location.href = response.url;
   } else {
       // Exibe a mensagem de erro na página
       const errorText = await response.text();
       const errorDiv = document.getElementById('error');
       errorDiv.style.display = 'inline-flex';
       errorDiv.innerText = errorText;

   }
};