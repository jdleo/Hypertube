"use strict";

const express	=	require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
	destination: './public/pics/',
	filename: (req, file, cb) => {
			cb(null,file.fieldname + '-' + Date.now() + path.extname(file.originalname));
	}
});

const upload = multer({
	storage: storage,
	limits:{fileSize: 3000000, files:1},
	fileFilter: (req, file, cb) => {
			checkFileType(file, cb);
	}
});

module.exports = (passport) => {
	router.post('/', upload.single('photo'), checkCredentials, passport.authenticate('local-signup', {
		successRedirect : '/', // redirect to the secure profile section
		failureRedirect : '/', // redirect back to the signup page if there is an error
		failureFlash : true, // allow flash messages
		session: false // prevent auto-login
	}));
	return router;
}

function checkCredentials(req, res, next) {
	if (req.cookies.i18n == undefined) res.setLocale('en')
	else res.setLocale(req.cookies.i18n)
	let {login, first_name, last_name, email, password, psswd_confirm} = req.body
	if (login && first_name && last_name && email && password && psswd_confirm) return next();

	req.flashAdd('tabError', res.__('Missing fields'));
	res.redirect('back');
}

function checkFileType(file, cb){
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
		const mimetype = filetypes.test(file.mimetype);

    if(mimetype && extname){
        return cb(null,true);
    } else {
        cb('Error: Images Only!');
    }
  }
