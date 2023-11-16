import * as path from 'node:path';
import * as url from 'node:url';

import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const db_filename = path.join(__dirname, 'db', 'stpaul_crime.sqlite3');

const port = 8000;

let app = express();
app.use(express.json());

/********************************************************************
 ***   DATABASE FUNCTIONS                                         *** 
 ********************************************************************/
// Open SQLite3 database (in read-write mode)
let db = new sqlite3.Database(db_filename, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.log('Error opening ' + path.basename(db_filename));
    }
    else {
        console.log('Now connected to ' + path.basename(db_filename));
    }
});

// Create Promise for SQLite3 database SELECT query 
function dbSelect(query, params) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
}

// Create Promise for SQLite3 database INSERT or DELETE query
function dbRun(query, params) {
    return new Promise((resolve, reject) => {
        db.run(query, params, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}

function jsonReplace(line, originalKey, replacementKey) {
    line[replacementKey] = line[originalKey];
    delete line[originalKey];
    return line; 
}

/********************************************************************
 ***   REST REQUEST HANDLERS                                      *** 
 ********************************************************************/
// GET request handler for crime codes
app.get('/codes', (req, res) => {
    let query = 'SELECT * FROM Codes';
    dbSelect(query, [])
    .then((data) => {
        data.forEach((line) => {
            line = jsonReplace(line, "incident_type", "type");
        });
        res.status(200).type('json').send(data); // <-- you will need to change this
    });

    console.log(req.query); // query object (key-value pairs after the ? in the url
});

// GET request handler for neighborhoods
app.get('/neighborhoods', (req, res) => {
    let query = 'SELECT * FROM Neighborhoods ORDER BY neighborhood_number';
    dbSelect(query, [])
    .then((data) => {
        data.forEach((line) => {
            line = jsonReplace(line, "neighborhood_number", "id");
            line = jsonReplace(line, "neighborhood_name", "name");
        });
        res.status(200).type('json').send(data); // <-- you will need to change this
    });
    console.log(req.query); // query object (key-value pairs after the ? in the url)
    
});

// GET request handler for crime incidents
app.get('/incidents', (req, res) => {
    let query = 'SELECT * FROM Incidents ORDER BY date_time DESC LIMIT 1000';
    dbSelect(query, [])
    .then((data) => {
        data.forEach((line) => {
            let dateTimeParsed = line.date_time.split("T");
            let date = dateTimeParsed[0];
            let time = dateTimeParsed[1];
            line = {
                "case_number": line.case_number,
                "date": date,
                "time": time,
                "code": line.code,
                "incident": line.incident,
                "police_grid": line.police_grid,
                "neighborhood_number": line.neighborhood_number,
                "block": line.block
            };
            console.log(line);
        });
        res.status(200).type('json').send(data); // <-- you will need to change this
    });
    console.log(req.query); // query object (key-value pairs after the ? in the url)
    });

// PUT request handler for new crime incident
app.put('/new-incident', (req, res) => {
    console.log(req.body); // uploaded data
    
    res.status(200).type('txt').send('OK'); // <-- you may need to change this
});

// DELETE request handler for new crime incident
app.delete('/remove-incident', (req, res) => {
    const incidentExist = 'SELECT * FROM incidents WHERE case_number = ?';
    const deleteQuery = 'DELETE FROM Incidents WHERE case_number = ?';
    const params = [parseInt(req.query.case_number)];

    dbSelect(incidentExist, params)
        .then((rows) => {
            if (rows.length > 0) {
                return dbRun(deleteQuery, params);
            } else {
                // Record not found
                throw new Error("Record not found");
            }
        })
        .then(() => {
          
            console.log(`${params} has been deleted`);
            res.status(200).type('txt').send(`Case number ${params} has been deleted successfully`);
        })
        .catch((error) => {
            // Handle errors
            //console.log( error);
            res.status(500).type('txt').send("Id cannot be found");
        });
});

/********************************************************************
 ***   START SERVER                                               *** 
 ********************************************************************/
// Start server - listen for client connections
app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
