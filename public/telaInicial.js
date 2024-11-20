var textPath = document.querySelector('#text-path');

var textContainer = document.querySelector('#text-container');

function updateTextPathOffset(offset){
    textPath.setAttribute('startOffset', offset);
}

updateTextPathOffset(500);

function onScroll(){
    requestAnimationFrame(function(){
        var rect = textContainer.getBoundingClientRect();
        console.log(rect.y);
        updateTextPathOffset(window.scrollY)
    });
}

window.addEventListener('scroll', onScroll)

function fetchUserName() {
    // Faz uma requisição para a rota que retorna o nome do usuário
    fetch('/getUser')
        .then(response => {
            if (response.ok) {
                return response.json(); // Converte a resposta para JSON
            } else {
                throw new Error('Erro ao buscar nome do usuário');
            }
        })
        .then(data => {
            if (data.prim_nome) {
                // Insere o nome no elemento com id "nome_user"
                document.getElementById('nome_user').textContent = data.prim_nome;
            }
        })
        .catch(error => console.error('Erro ao buscar nome do usuário:', error));
}

// Executa a função ao carregar a página
window.onload = fetchUserName;