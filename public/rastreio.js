const progress = document.getElementById("progress");
const progressSteps = document.querySelectorAll(".progress-step img");

let currentStep = 1;

progressSteps.forEach((step, index) => {
    step.addEventListener("click", () => {
        currentStep = index + 1; // Define o passo atual como o índice do passo clicado
        refresh();
    });
});

const refresh = () => {
    progressSteps.forEach((step, index) => {
        if (index < currentStep) {
            step.classList.add("active");
        } else {
            step.classList.remove("active");
        }
    });

    // Calcula a largura da linha de progresso
    let width = ((currentStep - 1) / (progressSteps.length - 1)) * 92;

    // Garante que a linha pare exatamente no último passo, sem ultrapassar
    progress.style.width = width + "%";
};

// Inicializa o progresso no primeiro passo
refresh();
