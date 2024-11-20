let qty = document.querySelector("#label-quant");


function decrement(){
    if(qty.value <=1){

        qty.value =1;
    }else{
        qty.value = parseInt(qty.value) - 1;
    }

    
}

function increment(){
    qty.value = parseInt(qty.value) + 1;
}


function modelo1(){
    document.getElementById("camiseta").src="imagens/camisetaPersonalizada.png"
}

function clique(){
    var modalJ = document.getElementById("janelaModal");
    var modalI = document.getElementById("imgModal");
    var modalB = document.getElementById("btnModal");

    modalJ.style.display="block";
    modalI.src="imagens/tabela.jpg";
    modalB.onclick=function(){
        modalJ.style.display="none";
    }

}


document.getElementById('adicionarCarrinho').onsubmit = async (event) => {
    event.preventDefault(); // Previne o envio padrão do formulário
    
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
 
    const response = await fetch('/adicionarCarrinho', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
 
        // Exibe a mensagem de erro na página
        const errorText = await response.text();
        const errorDiv = document.getElementById('mensagem');
        errorDiv.style.display = 'inline-flex';
        errorDiv.innerText = errorText;
 
 };
