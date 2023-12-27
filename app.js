const express = require('express');
const bodyParser = require('body-parser');
const setupControllers = require('./config/setupControllers');

// Importe tes controllers ici
const AuthController = require('./controllers/AuthController');

const app = express();

// Middleware pour parser le JSON
app.use(bodyParser.json());


// Enregistre les routes des controllers
setupControllers(app, [AuthController]);

// Gère les erreurs 404
app.use((req, res, next) => {
    res.status(404).send("Sorry, can't find that!");
});

app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(express.json()); // For parsing application/json

// Lance le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
