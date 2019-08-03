const LocalStrategy = require('passport-local').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const FortyTwoStrategy = require('passport-42').Strategy;
const GitHubStrategy = require('passport-github').Strategy;
const LinkedinStrategy = require('passport-linkedin-oauth2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt-nodejs');
const SQL = require('../Model/SQL.class');
const sql = new SQL();

module.exports = (passport) => {

    passport.serializeUser((user, done) => {
        done(null,user.id)
    })

    passport.deserializeUser((id, done) => {
        sql.select('*', 'users', {}, {id: id}).then(result => {
            done(null, result[0]);
        })
    })

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'
    // Set The Storage Engine

    passport.use('local-signup', new LocalStrategy({
        usernameField: 'login',
        passwordField: 'password',
        passReqToCallback: true
    }, (req, login, password, done) => {
        let photo;
        if (req.file) {
            photo = '/pics/'+req.file.filename;
        } else photo = '/pics/default.jpg';
        sql.select('*', 'users', {}, {login: login, email: req.body.email}).then(result => {
            if (!isSignUpValid(req, login, password, result)) return done(null, false);
            else {
                var newUser = {
                    login: login,
                    psswd: bcrypt.hashSync(password, bcrypt.genSaltSync(9)),
                    first_name: capitalizeFirstLetter(req.body.first_name),
                    last_name: capitalizeFirstLetter(req.body.last_name),
                    photo,
                    email: req.body.email,
                    token: bcrypt.hashSync('hypertube'+login, bcrypt.genSaltSync(9)).replace(/\//g, '')
                };
                sql.insert('users', newUser).then(result => {
                    let link = 'http://localhost:3001/confirm/'+newUser.login+'/'+newUser.token
                    let msgtext = "Valider votre compte en vous rendant a cette adresse : "+link
                    let msghtml = "<p>Valider votre compte en "+"<a href="+link+">cliquant ici</a></p>"
                    go("Hypertube", msgtext, msghtml, newUser.email)
                })
            }
        });

        let go = (subj, msgtext, msghtml, towho) => {
            nodemailer.createTestAccount((err, account) => {
            if (err) {
            console.error('Failed to create a testing account. ' + err.message);
            return process.exit(1);
            }

            // create reusable transporter object using the default SMTP transport
            let transporter = nodemailer.createTransport({
                port: 1025,
                ignoreTLS : true
            });

            // setup email data with unicode symbols
            let mailOptions = {
                from: '"Hypertube admins 👻" <admins@hypertube.com>', // sender address
                to: towho, // list of receivers
                subject: subj, // Subject line
                text: msgtext, // plain text body
                html: msghtml // html body
            };

            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                console.log('Error occurred. ' + err.message);
                return process.exit(1);
                }
                return done(null, null, req.flashAdd('tabSuccess', 'Bravo, finalisez votre compte en cliquant sur le lien que vous venez de recevoir par email!'));
            });
        });
        }
    }))

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================

    passport.use('local-signin',
        new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField: 'login',
            passwordField: 'password',
            passReqToCallback: true, // allows us to pass back the entire request to the callback
        }, (req, login, password, done) => {
            sql.select('*', 'users', {}, {login: login}).then(result => {
                if (Object.keys(result).length < 1) {
                    return done(null, false, req.flashAdd('tabError', 'Cet utilisateur n\'existe pas.'));
                }
                if (result[0].email_confirmed == 0)  return done(null, false, req.flashAdd('tabError', 'L\'email de ce compte n\'a pas encore ete confirme'));

                if (!bcrypt.compareSync(password, result[0].psswd)) return done(null, false, req.flashAdd('tabError', 'Oops! Mauvais mot de passe.'));

                return done(null, result[0]);
            })
        })
    );
}

function isSignUpValid (req, login, password, rows) {
    const pwdRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{6,20})");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nameRegex = new RegExp("^[a-zA-Z_]{1,16}$");
    const loginRegex = new RegExp("^[a-zA-Z0-9_]{1,16}$");
    let result = true;

    if (rows.length) {
        req.flashAdd('tabError', 'Ce pseudo/email est deja pris')
        result = false
    }
    if (!loginRegex.test(login)) {
        req.flashAdd('tabError', 'Pseudo: format incorrect')
        result = false
    }
    if (!nameRegex.test(req.body.first_name)) {
        req.flashAdd('tabError', 'first_name: format incorrect')
        result = false
    }
    if (!nameRegex.test(req.body.last_name)) {
        req.flashAdd('tabError', 'last_name: format incorrect')
        result = false
    }
    if (password !== req.body.psswd_confirm) {
        req.flashAdd('tabError', 'Les mots de passe ne correspondent pas.');
        result = false
    }
    if (!emailRegex.test(req.body.email)) {
        req.flashAdd('tabError', 'Syntaxe de l\'email invalide');
        result = false
    }
    if (!isLengthOkay('login', login, req) || !isLengthOkay('first_name', req.body.first_name, req) || !isLengthOkay('last_name', req.body.last_name, req))
        result = false
    return result
}

function isLengthOkay(champs, value, req) {
    let result = true
    if (value.length < 2) {
        req.flashAdd('tabError', champs+': too short');
        result = false
    }
    else if (value.length > 16) {
        req.flashAdd('tabError', champs+': too long');
        result = false
    }
    return result
}

function capitalizeFirstLetter(string) {
    return string[0].toUpperCase() + string.slice(1).toLowerCase();
}

function generatePassword() {
    var length = 12,
        charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        retVal = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  }
