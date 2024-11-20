function clique(){
    var modalJ = document.getElementById("janelaModal");
    var modalf = document.getElementById("fundo");
    var label = document.getElementById("div_mensagem");
    var modalB = document.getElementById("btnModal");

    modalJ.style.display="block";
    modalf.style.display="block";
    modalB.onclick=function(){
        modalJ.style.display="none";
        label.style.color="transparent";
    }
};
function clique_cartao(){
    var modalJ = document.getElementById("aba");
    var modalf = document.getElementById("fundoPreto");
    var modalBC = document.getElementById("btnModal_cartao");

    modalJ.style.display="block";
    modalf.style.display="block";
    modalBC.onclick=function(){
        modalJ.style.display="none";
    }
};

function mensagem(){
    var label = document.getElementById("div_mensagem");

    label.style.color="black";
}

function clique_status(){
    window.location.href = "/rastreio";
}



document.addEventListener('DOMContentLoaded', function() {
    // Carregar os dados do perfil ao carregar a página
    fetch('/perfil')
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao carregar perfil');
            }
            return response.json();
        })
        .then(data => {
            if (data.imagem_perfil) {
                document.getElementById('photo').src = `data:image/jpeg;base64,${data.imagem_perfil}`;
            }
        })
        .catch(error => console.error('Erro ao carregar o perfil:', error));

    // Lógica para upload da imagem
    document.getElementById('file').addEventListener('change', function() {
        const fileInput = this;
        const formData = new FormData();

        if (fileInput.files.length === 0) {
            alert('Selecione uma imagem para upload!');
            return;
        }

        formData.append('file', fileInput.files[0]);

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao fazer upload');
            }
            return response.json();
        })
        .then(data => {
            alert(data.message);
            // Atualizar a imagem no perfil após o upload
            const reader = new FileReader();
            reader.onload = function(event) {
                document.getElementById('photo').src = event.target.result;
            };
            reader.readAsDataURL(fileInput.files[0]);
        })
        .catch(error => console.error('Erro no upload:', error));
    });
});


