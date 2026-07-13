from typing import Literal, Optional
from pydantic import BaseModel, Field


class CreateRedemptionSchema(BaseModel):
    points_requested: float = Field(gt=0)
    payout_method: Literal["bank_transfer", "upi"]
    payout_details: str = Field(min_length=3)
    note_by_user: Optional[str] = None


class ReviewRedemptionSchema(BaseModel):
    note_by_admin: Optional[str] = None


class CompleteRedemptionSchema(BaseModel):
    note_by_admin: Optional[str] = None
    success: bool = True
