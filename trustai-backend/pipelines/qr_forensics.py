from __future__ import annotations

from typing import Any, Optional

import cv2
import numpy as np


def _points_to_bbox(points: Any) -> list[list[float]]:
    if points is None:
        return []

    array = np.asarray(points, dtype=float)
    if array.size == 0:
        return []

    array = array.reshape(-1, 2)
    return [
        [round(float(x), 2), round(float(y), 2)]
        for x, y in array
    ]


def detect_qr_in_image(image_path: str, *, page: Optional[int] = None) -> dict:
    result = {
        "found": False,
        "data": "",
        "page": page,
        "bbox": [],
        "decoder": "opencv",
    }

    try:
        image = cv2.imread(image_path)
        if image is None:
            result["error"] = "Image could not be read by OpenCV."
            return result

        detector = cv2.QRCodeDetector()
        data, points, _ = detector.detectAndDecode(image)

        if points is not None and data:
            result.update(
                {
                    "found": True,
                    "data": data,
                    "bbox": _points_to_bbox(points),
                }
            )
            return result

        retval, decoded_info, points, _ = detector.detectAndDecodeMulti(image)
        if retval and decoded_info:
            for index, payload in enumerate(decoded_info):
                if payload:
                    selected_points = (
                        points[index]
                        if points is not None and len(points) > index
                        else None
                    )
                    result.update(
                        {
                            "found": True,
                            "data": payload,
                            "bbox": _points_to_bbox(selected_points),
                        }
                    )
                    return result

        if points is not None:
            result["bbox"] = _points_to_bbox(points)

        return result

    except Exception as exc:
        result["error"] = type(exc).__name__
        return result
