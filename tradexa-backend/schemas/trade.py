from typing import Literal
from pydantic import BaseModel, Field

class PlaceTradeSchema(BaseModel):
    market_id: str
    side: Literal["yes", "no"]
    quantity: int = Field(ge=1)
