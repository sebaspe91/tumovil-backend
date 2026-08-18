
// Importamos nodemailer
import nodemailer from "nodemailer";

const emailOlvidePassword = async (datos) => {
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

    // Enviar el EMAIL

    const info = await transport.sendMail({
        from: '"TuMovil - Administrador de Productos" <from@example.com>', // quien lo envia
        to: correo_user, // email destino
        subject: 'Restablece tu Password', // es el asunto
        text: 'Restablece tu Password', // texto del mensaje
        html: `<p>Hola: ${nombre_user} ${apellido_user}, has solicitado reestablecer tu password.</p>
            <p>Sigue el siguiente enlace para generar un nuevo password: 
            <a href="${process.env.FRONTEND_URL}/olvide-password/${token}"> Reestablecer Password</a></p>

            <p>Si tu no creaste esta cuenta puedes ignorar este mensaje</p>
        `
    });

    console.log("Message enviado: %s", info.messageId);

}


export default emailOlvidePassword;