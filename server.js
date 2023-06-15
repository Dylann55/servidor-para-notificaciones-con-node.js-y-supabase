/*
  Crear directorio y escribir en su terminal npm init -y
  npm install dotenv
  npm install express nodemailer body-parser
  finalmente npm install cors
  para instalar supabase npm install @supabase/supabase-js
  para ejecutar node server.js
  para la clave para app utilzar este video como referencia
  https://www.youtube.com/watch?v=xvX4gWRWIVY&ab_channel=TechnicalRajni 

  para las encriptaciones npm install jsonwebtoken y tener un clave de cifrado


  resumen npm install dotenv express nodemailer body-parser cors jsonwebtoken @supabase/supabase-js
*/

//Para ejecutar el server o midleware
const express = require("express");

// Configuración de Supabase
// Se importa la función "connect" desde "./utils/supabase" para establecer la conexión con Supabase.
const { connect } = require("./utils/supabase");

//Permite la comunicacion entre distitos url
const cors = require("cors");

const app = express();
// Habilitar CORS para todas las solicitudes
app.use(cors());

//-------------------------------Enviar a administradores-------------------------------
require("dotenv").config(); // Cargar variables de entorno desde un archivo .env
const { createTransport } = require("nodemailer");

//Para el crud
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

//Para desencriptar
const jwt = require('jsonwebtoken');
const secretToken = process.env.secretToken;

//El intermediario entre el usuario y los administradores
const transporter = createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});
//pm2 start "nombre_archivo
//pm2 stop "nombre_archivo"
app.post("/send-email", async (req, res) => {
  //Verificar si tengo permiso y si el token es correcto
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  jwt.verify(token, secretToken, async (err, decoded) => {

    if (err) {
      // Devolver un mensaje de error si el token es inválido
      return res.status(403).json({ message: 'Token inválido' });
    }

    const { sender, message, messageType } = decoded;

    try {

      const supabase = await connect();

      // Obtener el email del usuario mediante la id
      const { data: dataUser, error: errorUser } = await supabase
        .from("usuario")
        .select("email")
        .eq("id", sender)
        .single(); // Utilizar .single() para obtener un solo registro

      if (errorUser) {
        console.error(error);
        return res.status(500).json({ error: 'Error seaching usuario' });
      }
      // Email del usuario
      const email = dataUser.email;

      // Obtener los registros de la tabla en Supabase con el rol "admin"
      const { data: adminData, error: adminError } = await supabase
        .from("usuario")
        .select("email")
        .eq("role", "Administrador");

      if (adminError) {
        console.error(adminError);
        return res.status(500).json({ error: 'Error seaching usuario' });
      }

      if (!adminData || adminData.length === 0) {
        console.log("No se encontraron usuarios administradores");
        return res.status(404).json({ message: 'No se encontraron usuarios administradores' });
      }

      // Configurar las opciones del email electrónico para enviar a los administradores
      const adminEmails = adminData.map((row) => row.email);
      const mailOptions = {
        from: email,
        to: adminEmails.join(", "),
        subject: messageType,
        text: `De: ${email}\n\n${message}`,
      };

      // Enviar el email electrónico
      const { error: emailError } = await transporter.sendMail(mailOptions);
      if (emailError) {
        console.error(emailError);
        return res.status(500).send("Error al enviar el email electrónico");
      }

      console.log("email electrónico enviado correctamente");

      // Configurar las opciones del email electrónico para enviar al cliente
      // Enviar email electrónico al cliente con los correos electrónicos de los administradores
      const clientMailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Correos electrónicos de los administradores",
        text: `Los correos electrónicos de los administradores son: ${adminEmails.join(
          ", "
        )}`,
      };

      // Enviar el email electrónico al cliente
      const { error: clientEmailError } = await transporter.sendMail(
        clientMailOptions
      );
      if (clientEmailError) {
        // Mostrar un mensaje de error si ocurre un problema al enviar el email electrónico al cliente
        console.error(clientEmailError);
        return res
          .status(500)
          .send("Error al enviar el email electrónico al cliente");
      }

      console.log("email electrónico enviado correctamente al cliente");
      res.send("email electrónico enviado correctamente");
    } catch (error) {
      // Mostrar un mensaje de error si ocurre un problema en el servidor
      console.error(error);
      res.status(500).send("Error en el servidor");
    }
  });
});

//para comunicarse es http://localhost:4040/
app.listen(4040, () => {
  console.log("Server is running on port 4040");
});
