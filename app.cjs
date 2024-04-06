const express = require('express');
const multer = require('multer');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, listAll, getDownloadURL } = require('firebase/storage');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, signOut } = require('firebase/auth');
const bodyParser = require('body-parser');
const { create } = require('domain');
const { appendFileSync } = require('fs');
const session = require('express-session');


const app = express();

app.use(session({
    secret: '9467966593', // Change this to a secure random key
    resave: false,
    saveUninitialized: true
}));

app.use(express.static('public'));
const port = 3000; // Port number for the server to listen on
app.use(bodyParser.urlencoded({ extended: true }));

// Parse JSON bodies (as sent by API clients)
app.use(bodyParser.json());



const firebaseConfig = {
    apiKey: "AIzaSyCsNfYk-8t8M2TpyBH4BMzpT2COMkCBadU",
    authDomain: "pdf-viewer-a4fcc.firebaseapp.com",
    databaseURL: "https://pdf-viewer-a4fcc-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "pdf-viewer-a4fcc",
    storageBucket: "pdf-viewer-a4fcc.appspot.com",
    messagingSenderId: "610416538132",
    appId: "1:610416538132:web:fb41d74b86af2b2ad6ad01",
    measurementId: "G-7FLRFN1QK1"
};

const appFirebase = initializeApp(firebaseConfig);
const storage = getStorage(appFirebase);

const auth = getAuth();
// Set up storage for uploaded files using Multer
const storage3 = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Files will be saved in the 'uploads' directory
    },
    filename: function (req, file, cb) {
        // Use current timestamp as filename to avoid collisions
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// Create a Multer instance with the configured storage
const upload = multer({ storage: storage });

app.post('/upload', upload.single('fileUpload'), async (req, res) => {
    // Log the filename to the terminal
    const fileRef = ref(storage1, 'uploadedFiles/' + req.file.filename);
    const fileData = await uploadBytes(fileRef, req.file.buffer);
    console.log('File uploaded:', req.file.filename);
    res.send('File uploaded successfully');
});


// Set EJS as the view engine
app.set('view engine', 'ejs');



// // const storegeRef = ref(storage);
const CS304Ref = ref(storage, "CS304");


const isAuthenticated = (req, res, next) => {
    const user = req.session.user;
    // console.log(req.user);
    if (user) {
        if (user.emailVerified) {
            next();
        }
        else {
            res.redirect('/email_verification')
        }
        // If the user is authenticated, proceed to the next middleware
    } else {
        // If the user is not authenticated, redirect to the login page
        res.redirect('/login');
    }
};

app.get('/view_items', isAuthenticated, (req, res) => {
    // List all items in the "CS304" folder
    listAll(CS304Ref)
        .then(result => {
            const promises = result.items.map(itemRef => {
                // Get the download URL for each item
                return getDownloadURL(itemRef)
                    .then(url => ({ name: itemRef.name, url }))
                    .catch(error => {
                        console.error('Error getting download URL:', error);
                        return null;
                    });
            });
            // Wait for all promises to resolve
            Promise.all(promises)
                .then(items => {
                    // Render the EJS template with the retrieved items
                    res.render('notes_page', { items });
                })
                .catch(error => {
                    console.error('Error processing download URLs:', error);
                    res.status(500).send('Internal server error');
                });
        })
        .catch(error => {
            console.error('Error listing items in "CS304" folder:', error);
            res.status(500).send('Internal server error');
        });
});


app.get('/', (req, res) => {
    res.render('home_page');
});

app.post('/loginbtn', async (req, res) => {
    res.render('login')
})

app.get('/signout', async (req, res) => {
    signOut(auth).then(() => {
        console.log("Sign-out successful.");
        res.render('home_page');
    }).catch((error) => {
        console.log("An error happened.");
        res.render('home_page');
    });
})

app.get('/verifyemail', async (req, res) => {
    sendEmailVerification(auth.currentUser)
        .then(() => {
            console.log("Email verification sent successfully.");
        })
        .catch((error) => {
            console.error("Error sending email verification:", error);
        });
})

app.get('/home_page', (req, res) => {
    res.render('home_page'); // Assuming 'home_page' is an EJS file you want to render
});

app.post('/signupbtn', async (req, res) => {
    res.render('signup')
})

app.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // User signed up successfully
        const user = userCredential.user;
        console.log("User signed up successfully:", user.uid);
        // Send email verification
        sendEmailVerification(auth.currentUser)
            .then(() => {
                console.log("Email verification sent successfully.");
            })
            .catch((error) => {
                console.error("Error sending email verification:", error);
            });

        req.session.user = userCredential.user
        res.redirect('/view_items');
        // res.status(200).send("User signed up successfully");
    } catch (error) {
        // Handle sign up errors
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error("Error signing up:", errorCode, errorMessage);
        res.status(500).send("Error signing up: " + errorMessage);
    }
})
app.get('/email_verification', (req, res) => {
    const user = req.session.user;
    const userEmail = user.email;
    res.render('email_verification', { email: userEmail });

})


app.get('/login', (req, res) => {
    const user = req.session.user;
    if (user) {
        // If the user is already logged in, redirect to view_items page
        res.redirect('/view_items');
    } else {
        // If the user is not logged in, render the login page
        res.render('login');
    }
});

app.get('/signup', (req, res) => {
    res.render('signup')
})

app.post('/login', async (req, res) => {
    const user = auth.currentUser;
    if (user) {
        // If the user is already logged in, redirect to view_items page
        res.redirect('/view_items');
    } else {
        const { email, password } = req.body;
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            req.session.user = userCredential.user;
            res.redirect('/view_items');
        } catch (error) {
            // Handle sign in errors
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error("Error signing in:", errorCode, errorMessage);
            res.status(500).send("Error signing in: " + errorMessage);
        }
    }
});// Start the server

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

