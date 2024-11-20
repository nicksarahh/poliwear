function increment(itemId) {
    const quantityInput = document.getElementById(`label-quant-${itemId}`);
    
    if (quantityInput) {
        let currentQuantity = parseInt(quantityInput.value);
        currentQuantity++;

        // Atualiza a quantidade no campo
        quantityInput.value = currentQuantity;

        // Enviar a nova quantidade para o servidor
        updateQuantityInServer(itemId, currentQuantity);
    } else {
        console.error(`Elemento com id 'label-quant-${itemId}' não encontrado.`);
    }
}

function decrement(itemId) {
    const quantityInput = document.getElementById(`label-quant-${itemId}`);
    
    if (quantityInput) {
        let currentQuantity = parseInt(quantityInput.value);

        if (currentQuantity > 1) {
            currentQuantity--;

            // Atualiza a quantidade no campo
            quantityInput.value = currentQuantity;

            // Enviar a nova quantidade para o servidor
            updateQuantityInServer(itemId, currentQuantity);
        }
    } else {
        console.error(`Elemento com id 'label-quant-${itemId}' não encontrado.`);
    }
}

function updateQuantityInServer(itemId, newQuantity) {
    fetch('/atualizar-quantidade', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: itemId, quantidade: newQuantity })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro ao atualizar a quantidade.');
        }
        return response.json();
    })
    .then(data => {
        console.log('Quantidade atualizada com sucesso:', data);
    })
    .catch(error => {
        console.error('Erro:', error);
    });
}
