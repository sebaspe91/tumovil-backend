
// Importamos nodemailer
import nodemailer from "nodemailer";

const emailRegistro = async (datos) => {
    const transport = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS // YOUR_API_TOKEN
        }
    });

    // Extraemos los datos
    const {correo_user, nombre_user, apellido_user, token} = datos;

    // Enviar el correo_user

    const info = await transport.sendMail({
        from: '"TuMovil - Administrador de Productos" <from@example.com>', // quien lo envia
        to: correo_user, // email destino
        subject: 'Comprueba tu cuenta en TuMovil', // es el asunto
        text: 'Comprueba tu cuenta en TuMovil', // texto del mensaje
        html: `<p>Hola: ${nombre_user} ${apellido_user}, Comprueba tu cuenta en TuMovil.</p>
            <p>Tu cuenta ya esta lista, solo debes comprobarla en el siguiente enlace: 
            <a href="${process.env.FRONTEND_URL}/confirmar/${token}"> Comprobar Cuenta</a></p>

            <p>Si tu no creaste esta cuenta puedes ignorar este mensaje</p>
        `
    });

    console.log("Message enviado: %s", info.messageId);

}


export default emailRegistro;