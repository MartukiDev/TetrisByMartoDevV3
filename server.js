const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const db = new sqlite3.Database('./ladderboard.db');
const cors = require(cors);


app.use(
  cors({
    origin: ['http://localhost:3000/'],
  })
);
app.use(express.json());
app.use(express.static('public')); // Tu carpeta de archivos estáticos (HTML, JS, CSS)

db.run(`CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    score INTEGER NOT NULL
  )`);

// Ruta para obtener los 10 mejores puntajes
app.get('/leaderboard', (req, res) => {
    const query = `SELECT name, score FROM scores ORDER BY score DESC LIMIT 10`;
    db.all(query, [], (err, rows) => {
      if (err) {
        return res.status(500).send('Error al obtener los puntajes.');
      }
      res.json(rows); // Enviar la lista de puntajes como JSON
    });
});

// Ruta para guardar un nuevo puntaje
app.post('/submit-score', (req, res) => {
    const { name, score } = req.body;
  
    // Verifica si el jugador ya existe en la base de datos
    const query = `SELECT score FROM scores WHERE name = ?`;
    db.get(query, [name], (err, row) => {
      if (err) {
        console.error(err.message);
        return res.status(500).send('Error al verificar el puntaje.');
      }
  
      if (row) {
        // Si el jugador ya tiene un puntaje registrado, actualiza solo si el nuevo puntaje es mayor
        if (score > row.score) {
          const updateQuery = `UPDATE scores SET score = ? WHERE name = ?`;
          db.run(updateQuery, [score, name], (err) => {
            if (err) {
              console.error(err.message);
              return res.status(500).send('Error al actualizar el puntaje.');
            }
            res.send('Puntaje actualizado correctamente.');
          });
        } else {
          res.send('El puntaje no es mayor que el puntaje actual.');
        }
      } else {
        // Si el jugador no tiene un puntaje registrado, inserta uno nuevo
        const insertQuery = `INSERT INTO scores (name, score) VALUES (?, ?)`;
        db.run(insertQuery, [name, score], (err) => {
          if (err) {
            console.error(err.message);
            return res.status(500).send('Error al guardar el puntaje.');
          }
          res.send('Puntaje guardado correctamente.');
        });
      }
    });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});