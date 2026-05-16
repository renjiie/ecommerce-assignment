from uuid import UUID

from fastapi import HTTPException, status


class OrderNotFoundException(HTTPException):
    def __init__(self, order_id: UUID) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ORDER_NOT_FOUND", "message": f"Order {order_id} not found"},
        )


class InvalidTransitionException(HTTPException):
    def __init__(self, message: str) -> None:
        super().__init__(
            status_code=422,
            detail={"code": "INVALID_TRANSITION", "message": message},
        )


class ForbiddenException(HTTPException):
    def __init__(self, message: str = "You do not have access to this resource") -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": message},
        )
