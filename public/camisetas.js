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

function mudarImagem(cor) {
    const camiseta = document.getElementById("camiseta");
    const imagemInput = document.getElementById("imagem");
    let imagemSelecionada;

    if (cor === "branca") {
        imagemSelecionada = "imagens/camisetaBranca.png"; // Caminho da camiseta branca
    } else {
        imagemSelecionada = "imagens/camisetaPreta.png"; // Caminho da camiseta preta
    }

    camiseta.src = imagemSelecionada; // Atualiza a imagem
    imagemInput.value = imagemSelecionada; // Atualiza o input hidden

    console.log("Imagem alterada para:", imagemSelecionada); // Log para depuração
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
 
    if (response.redirected) {
        // Se o servidor redirecionar, navegue para a nova URL
        window.location.href = response.url;
    } else {
        // Exibe a mensagem de erro na página
        const errorText = await response.text();
        const errorDiv = document.getElementById('mensagem');
        errorDiv.style.display = 'inline-flex';
        errorDiv.innerText = errorText;
 
    }
 };
