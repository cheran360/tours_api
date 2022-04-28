const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    requires: [true, 'please tell us your name'],
  },
  email: {
    type: String,
    requires: [true, 'please tell us your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'please provide a valid email'],
  },
  photo: {
    type: String,
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-tour-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please provide confirmation'],
    validate: {
      // This only works on CREATE and SAVE !!
      validator: function (el) {
        return el === this.password; //abc == abc
      },
      message: 'Passswords are not the same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

// userSchema.pre('save', async function (next) {
// Only run this func if password was actually modified
//   if (!this.isModified('password')) {
//     return next();
//   }
//   //Hash the password with cost of 12
//   this.password = await bcrypt.hash(this.password, 12);

//   //Delete the password confirm field
//   this.passwordConfirm = undefined;
//   next();
// });

// userSchema.pre('save', function (next) {
//   if (!this.isModified('password') || this.isNew) return next();

//   this.passwordChangedAt = Date.now() - 1000; //Token is created after password is changed
//   next();
// });

// /^find/ --> any query starting with 'find' word.
userSchema.pre(/^find/, function (next) {
  //this-> points to current query string
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candiadatePassword,
  userPassword
) {
  return await bcrypt.compare(candiadatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = this.passwordChangedAt.getTime();

    console.log(changedTimestamp, JWTTimestamp);
    return JWTTimestamp > changedTimestamp; // we changed the password after the token was issued.
  }
  //false means password not changed
  return false;
};

userSchema.methods.createPassswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
