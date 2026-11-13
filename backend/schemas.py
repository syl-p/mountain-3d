from pydantic import BaseModel
from pydantic.fields import Field

class BoxReq(BaseModel):
    mode: str
    bbox: tuple[float, float, float, float]
    track: list[tuple[float, float]] | None = Field(default=None, max_length=5000)

    model_config = {
        "json_schema_extra": {
            "example": {
                "mode": "bbox",
                "bbox": [6.05, 44.85, 6.15, 44.95],
                "track": [
                  [6.07, 44.88], [6.085, 44.895], [6.10, 44.90], [6.115, 44.915], [6.13, 44.92],
                ]
            }
        }
    }

    def check(self):
        lon0, lat0, lon1, lat1 = self.bbox
        if not (lon0 < lon1 and lat0 < lat1):
            raise ValueError("bbox invalide")

        return self
