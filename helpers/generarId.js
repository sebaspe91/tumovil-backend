// Generamos el token

//  Es usado para el codigo de Veterinario.js que es el modelo donde se crea el TOKEN
const generarId = () => {
    // Geneerar un id unico para el token esta forma es manual
    return Date.now().toString(32) + Math.random().toString(32).substring(2);
}

export default generarId;