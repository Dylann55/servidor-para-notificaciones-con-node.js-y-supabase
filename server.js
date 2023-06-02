/*
  Crear directorio y escribir en su terminal npm init -y
  npm install dotenv
  npm install express nodemailer body-parser
  finalmente npm install cors
  para instalar supabase npm install @supabase/supabase-js
  para ejecutar node server.js
  para la clave para app utilzar este video como referencia
  https://www.youtube.com/watch?v=xvX4gWRWIVY&ab_channel=TechnicalRajni 

*/

//Para ejecutar el server o midleware
const express = require("express");

// Configuración de Supabase
//Las exporto directamenrte ya que no tengo la tabla llamada status
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

const transporter = createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

app.post("/send-email", async (req, res) => {
  const { sender, message, messageType } = req.body;
  try {
    // Obtener los registros de la tabla en Supabase con el rol "admin"
    const supabase = await connect();
    const { data, error } = await supabase
      .from("usuario")
      .select("email")
      .eq("role", "admin");

    if (error) {
      console.error(error);
      return res
        .status(500)
        .send(
          "Error al obtener los correos electrónicos de los administradores"
        );
    }
    // Enviar el correo electrónico a los administradores
    const adminEmails = data.map((row) => row.email);
    const mailOptions = {
      from: sender,
      to: adminEmails.join(", "),
      subject: messageType,
      text: `De: ${sender}\n\n${message}`,
    };

    // Enviar el correo electrónico
    const { error: emailError } = await transporter.sendMail(mailOptions);
    if (emailError) {
      console.error(emailError);
      return res.status(500).send("Error al enviar el correo electrónico");
    }

    console.log("Correo electrónico enviado correctamente");

    // Enviar correo electrónico al cliente con los correos electrónicos de los administradores
    const clientMailOptions = {
      from: process.env.EMAIL_USER,
      to: sender,
      subject: "Correos electrónicos de los administradores",
      text: `Los correos electrónicos de los administradores son: ${adminEmails.join(
        ", "
      )}`,
    };

    // Enviar el correo electrónico al cliente
    const { error: clientEmailError } = await transporter.sendMail(
      clientMailOptions
    );
    if (clientEmailError) {
      console.error(clientEmailError);
      return res
        .status(500)
        .send("Error al enviar el correo electrónico al cliente");
    }

    console.log("Correo electrónico enviado correctamente al cliente");
    res.send("Correo electrónico enviado correctamente");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error en el servidor");
  }
});

//para comunicarse es http://localhost:3000/
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
