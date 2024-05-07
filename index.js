const express = require('express');
const app = express();
const dotenv = require("dotenv")
const port = 3000;
dotenv.config();
const controller = require("./src/controller")
const repository = require("./src/repository")
app.use(express.json())

// Endpoints
app.get('/', async (req, res) => {
  res.send('Hello World!');
});

app.get('/demo', controller.sampleCreate);

app.post('/add-team', controller.createTeam);

app.get('/process-result', controller.processResult);

app.get('/team-result', controller.teamResult);


app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal Server Error', success: false });
});

repository.run()

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
