from typing import Literal
from pydantic import BaseModel, Field

class WalletAdjustmentSchema(BaseModel):
    amount: float = Field(gt=0)
    operation: Literal["add", "subtract"]
    reason: str = Field(min_length=5)
