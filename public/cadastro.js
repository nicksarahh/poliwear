document.getElementById('cadastroForm').onsubmit = async (event) => {
    event.preventDefault(); // Previne o envio padrão do formulário
    
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
 
    const response = await fetch('/cadastro', {
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