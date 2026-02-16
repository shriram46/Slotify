const validateRegister = ({ name, email, password }) => {

  // Name validation
  if (!name || name.trim().length === 0) return "Name is required";
  if (name.trim().length < 2) return "Name must be at least 2 characters long";
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  if (!nameRegex.test(name.trim())) return "Name contains invalid characters";

  // Email validation
  if (!email || email.trim().length === 0) return "Email is required";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim().toLowerCase())) return "Invalid email format";

  // Password validations
  if (!password || password.length === 0) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters long";
  if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must include at least one lowercase letter";
  if (!/\d/.test(password)) return "Password must include at least one number";
  if (!/[@$!%*?&]/.test(password)) return "Password must include at least one special character (@$!%*?&)";

  return null; // All validations passed
};

const validateLogin = ({ email, password }) => {
  if (!email || email.trim().length === 0) return "Email is required";
  if (!password || password.length === 0) return "Password is required";
  return null;
};

module.exports = { validateRegister, validateLogin };
