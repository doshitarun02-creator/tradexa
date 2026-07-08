from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, field_validator

class CreateMarketSchema(BaseModel):
    question: str
    category: Literal["Crypto", "Forex", "Macro", "Stocks", "Commodities"]
    icon: str
    price_symbol: str
    end_time: datetime
    b: float

    @field_validator("b")
    @classmethod
    def b_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("b must be greater than 0")
        return v

    @field_validator("question")
    @classmethod
    def question_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("question is required")
        return v.strip()


class UpdateMarketSchema(BaseModel):
    question: Optional[str] = None
    category: Optional[Literal["Crypto", "Forex", "Macro", "Stocks", "Commodities"]] = None
    icon: Optional[str] = None
    price_symbol: Optional[str] = None
    end_time: Optional[datetime] = None
    b: Optional[float] = None

    @field_validator("b")
    @classmethod
    def b_must_be_positive(cls, v):
        if v is not None and v <= 0:
            raise ValueError("b must be greater than 0")
        return v
