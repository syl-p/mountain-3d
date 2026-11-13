import logging
from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware

from schemas import BoxReq
from services import track
from services.terrain import get_terrain, IGNError
from utils.geo import square_from_bbox, SquareError
logger = logging.getLogger("uvicorn.error")

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://localhost:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods="*",
    allow_headers="*",
    allow_credentials=True
)

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.post("/terrain")
async def terrain(req: BoxReq):
    print(req)
    try:
        sq = square_from_bbox(*req.bbox)
    except SquareError as e:
        return Response(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, content=str(e))

    try:
        data = await get_terrain(sq, track=req.track)
    except IGNError as err:
        logger.error("Erreur IGN pour %s : %s", req.bbox, err)
        return Response(status_code=status.HTTP_400_BAD_REQUEST, content=str(err))
    except Exception as err:
        logger.exception("Erreur inattendue pour %s", req.bbox)
        raise Response(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erreur interne : {err}")
    return data
