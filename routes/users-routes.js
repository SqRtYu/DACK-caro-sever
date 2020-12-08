const express = require('express');
const { check } = require('express-validator');

const checkAuth = require('../middleware/check-auth.js');
const usersControllers = require('../controllers/users-controllers');
const fileUpload = require('../middleware/uploadImageUsers');

const router = express.Router();

router.get('/:uid', usersControllers.getUserById);

router.post(
  '/signup',
  fileUpload.single('image'),
  [
    check('userName').not().isEmpty(),
    check('name').not().isEmpty(),
    check('email').normalizeEmail({ gmail_remove_dots: false }).isEmail(),
    check('password').isLength({ min: 6 }),
  ],
  usersControllers.signup
);

router.post('/login', usersControllers.login);
router.post('/loginGoogle', usersControllers.loginGoogle);
router.post('/loginFacebook', usersControllers.loginFacebook);

router.use(checkAuth);

router.patch(
  '/:uid',
  fileUpload.single('image'),
  [
    check('userName').not().isEmpty(),
    check('name').not().isEmpty(),
    check('email').normalizeEmail({ gmail_remove_dots: false }).isEmail(),
    check('password').isLength({ min: 6 }),
  ],
  usersControllers.updateUser
);

router.patch(
  '/:uid/password',
  [check('password').isLength({ min: 6 })],
  usersControllers.updateUserPassword
);

module.exports = router;
