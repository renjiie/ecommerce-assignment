from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

from app.orders.enums import OrderStatus


class OrderItemRequest(BaseModel):
    product_id: UUID
    quantity: int
    unit_price: Decimal

    @field_validator("quantity")
    @classmethod
    def quantity_must_be_positive(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("Quantity must be greater than zero")
        return value

    @field_validator("unit_price")
    @classmethod
    def price_must_be_positive(cls, value: Decimal) -> Decimal:
        if value <= 0:
            raise ValueError("Unit price must be greater than zero")
        return value


class CreateOrderRequest(BaseModel):
    items: list[OrderItemRequest]

    @field_validator("items")
    @classmethod
    def items_must_not_be_empty(cls, value: list[OrderItemRequest]) -> list[OrderItemRequest]:
        if not value:
            raise ValueError("An order must contain at least one item")
        return value


class UpdateOrderStatusRequest(BaseModel):
    status: OrderStatus


class OrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID
    quantity: int
    unit_price: Decimal

    @field_serializer("unit_price")
    def serialize_unit_price(self, value: Decimal) -> str:
        return str(value)


class OrderStatusHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: OrderStatus
    changed_by: str
    created_at: datetime


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    customer_id: str
    status: OrderStatus
    total_amount: Decimal
    items: list[OrderItemResponse]
    status_history: list[OrderStatusHistoryResponse]
    created_at: datetime
    updated_at: datetime

    @field_serializer("total_amount")
    def serialize_total_amount(self, value: Decimal) -> str:
        return str(value)


class OrderListResponse(BaseModel):
    items: list[OrderResponse]
    total: int
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=100)

