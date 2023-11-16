import * as path from 'node:path';
import * as url from 'node:url';

import { default as express, query } from 'express';
import { default as sqlite3 } from 'sqlite3';
import { isStringObject } from 'node:util/types';

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
    let queryParams = req.query;
    let query = 'SELECT * FROM Codes';
    let params = [];

    if (queryParams.hasOwnProperty("code")) {
        let codes = queryParams.code.split(",");
        query = 'SELECT * FROM Codes WHERE ';

        codes.forEach((code) => {
            codes[codes.length - 1] != code ? query += "code = ? OR " : query += "code = ?"; // Construct query string
            params.push(code);
        });
    }

    dbSelect(query, params)
    .then((data) => {
        data.forEach((line) => {
            line = jsonReplace(line, "incident_type", "type"); // Rename key
        });
        res.status(200).type('json').send(data);
    });
});

// GET request handler for neighborhoods
app.get('/neighborhoods', (req, res) => {
    let queryParams = req.query;
    let query = 'SELECT * FROM Neighborhoods ORDER BY neighborhood_number';
    let params = [];

    if (queryParams.hasOwnProperty("id")) {
        let ids = queryParams.id.split(",");
        query = 'SELECT * FROM Neighborhoods WHERE ';

        ids.forEach((id) => {
            ids[ids.length - 1] != id ? query += "neighborhood_number = ? OR " : query += "neighborhood_number = ?"; // Construct query string
            params.push(id);
        });
    }

    query += "ORDER BY neighborhood_number";    

    dbSelect(query, params)
    .then((data) => {
        data.forEach((line) => {
            line = jsonReplace(line, "neighborhood_number", "id"); // Rename keys
            line = jsonReplace(line, "neighborhood_name", "name");
        });
        res.status(200).type('json').send(data);
    });   
});

// GET request handler for crime incidents
app.get('/incidents', (req, res) => {    
    let queryParams = req.query;
    let query = 'SELECT * FROM Incidents ';
    let params = [];
    let constructedParams = [];
    let limit = 1000;

    if (queryParams.hasOwnProperty("limit")) {
        limit = queryParams.limit;
    }


    if (queryParams.hasOwnProperty("code")) {
        let codes = queryParams.code.split(",");
        let constructedParam = "( ";

        codes.forEach((code) => {
            codes[codes.length - 1] != code ? constructedParam += "code = ? OR " : constructedParam += "code = ? )"; // Construct query string
            constructedParams.push(constructedParam);
            params.push(code);
        });
    }

    if (queryParams.hasOwnProperty("end_date")) {
        constructedParam = 'date_time <= ' + queryParams.date;
        constructedParams.push(constructedParam);
    }  


    if (queryParams.hasOwnProperty("start_date")) {
        constructedParam = 'date_time >= ' + queryParams.date;
        constructedParams.push(constructedParam);
    }  

    if (queryParams.hasOwnProperty("grid")) {
        let grids = queryParams.grid.split(",");
        let constructedParam = "( ";

        grids.forEach((grid) => {
            grids[grids.length - 1] != grid ? constructedParam += "police_grid = ? OR " : constructedParam += "police_grid = ? )"; // Construct query string
            params.push(grid);
        });

        constructedParams.push(constructedParam);
    }

    if (queryParams.hasOwnProperty("neighborhood")) {
        let neighborhoods = queryParams.neighborhood.split(",");
        let constructedParam = "( ";

        neighborhoods.forEach((neighborhood) => {
            neighborhoods[neighborhoods.length - 1] != neighborhood ? constructedParam += "neighborhood_number = ? OR " : constructedParam += "neighborhood_number = ? )"; // Construct query string
            params.push(neighborhood);
        });

        constructedParams.push(constructedParam);
    }


    if ( constructedParams.length > 0 ) {
        query += "WHERE ";

        constructedParams.forEach((constructedParam) => {
            query += constructedParam;
            if ( constructedParams[constructedParams.length - 1] != constructedParam ) {
                query += " AND ";
            }
        });
    } 
    query += " ORDER BY date_time DESC LIMIT " + limit;



    dbSelect(query, params)
    .then((data) => {
        let returnObject = [];
        data.forEach((line) => {
            let dateTimeParsed = line.date_time.split("T"); // Seperate date and time
            let date = dateTimeParsed[0];
            let time = dateTimeParsed[1];
            let incident = { // Map to new indcident object
                "case_number": line.case_number,
                "date": date,
                "time": time,
                "code": line.code,
                "incident": line.incident,
                "police_grid": line.police_grid,
                "neighborhood_number": line.neighborhood_number,
                "block": line.block
            };

            returnObject.push(incident); 
        });
        res.status(200).type('json').send(returnObject);

    });
    });

// PUT request handler for new crime incident
app.put('/new-incident', (req, res) => {
    const data = req.body    
    let newIncident = []
    
    Object.values(data).forEach((item) => {
        typeof(item) == "string" ? newIncident.push(`"${item}"`) : newIncident.push(item)
    });
    const query = "INSERT INTO Incidents VALUES (" + newIncident + ");"

    const p = dbSelect(query, [])
    p.then((data, err) => {
        res.status(200).type('txt').send("Successfully added data to DB"); 
    }).catch((err) => {
        res.status(500).type('txt').send(err);
    })
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
