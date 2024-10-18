const { Router } = require('express');
const router = Router();
const { spawn } = require('child_process');

function runPythonScript(scriptPath, args) {

    // Use child_process.spawn method from 
    // child_process module and assign it to variable
    const pyProg = spawn('python', [scriptPath].concat(args));

    // Collect data from script and print to console
    let data = '';
    pyProg.stdout.on('data', (stdout) => {
        console.log(`stdout: ${stdout}`);
    });

    // Print errors to console, if any
    pyProg.stderr.on('data', (stderr) => {
        console.log(`stderr: ${stderr}`);
    });

    // When script is finished, print collected data
    pyProg.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        console.log(data);
    });
}

module.exports = (db) => {

    router.get('/', async (req, res) => {

        const permissions = await db.getUserPermissions(req.session.userID);

        return res.render('games/tic-tac-toe', {
            loggedIn: typeof req.session.username != "undefined", username: req.session.username, usertype: permissions, profilePic: await db.getPreference(req.session.userID, 'profilePic'),
        });
    });

    router.post('/move', async (req, res) => {

        const { square } = req.body;

        runPythonScript('games/ttt-ai.py', [JSON.stringify(square)]);

        return res.status(200).send(JSON.stringify({ square: 9 }));

    });

    return router;
}