use validator::ValidateEmail;

pub fn is_email(value: &str) -> bool {
    value.validate_email()
}
