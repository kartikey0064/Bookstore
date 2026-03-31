from dataclasses import dataclass, field


@dataclass
class User:
    email: str
    name: str
    role: str = "user"
    dob: str = ""
    password_hash: str = ""
    profile_pic: str = ""
    google_id: str = ""
    auth_provider: str = "local"
    email_verified: bool = False
    phone: str = ""
    address_line: str = ""
    city: str = ""
    postal_code: str = ""
    country: str = ""
    extra: dict = field(default_factory=dict)
