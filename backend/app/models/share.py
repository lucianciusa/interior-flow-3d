from pydantic import BaseModel, ConfigDict


class ShareTokenResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str
    url: str
    expires_at: str
