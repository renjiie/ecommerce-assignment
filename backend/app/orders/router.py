from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db, require_admin
from app.core.security import ClerkUser
from app.orders.enums import OrderStatus
from app.orders.repository import OrderRepository
from app.orders.schemas import (
    CreateOrderRequest,
    OrderListResponse,
    OrderResponse,
    UpdateOrderStatusRequest,
)
from app.orders.service import OrderService

router = APIRouter(prefix="/orders", tags=["orders"])
limiter = Limiter(key_func=get_remote_address)


def get_order_service() -> OrderService:
    return OrderService(OrderRepository())


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def create_order(
    request: Request,
    payload: CreateOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: ClerkUser = Depends(get_current_user),
    service: OrderService = Depends(get_order_service),
) -> OrderResponse:
    order = await service.create_order(db, payload.items, customer_id=current_user.id)
    return OrderResponse.model_validate(order)


@router.get("", response_model=OrderListResponse)
async def list_orders(
    status_filter: OrderStatus | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: ClerkUser = Depends(get_current_user),
    service: OrderService = Depends(get_order_service),
) -> OrderListResponse:
    orders, total = await service.list_orders(
        db,
        current_user=current_user,
        status=status_filter,
        page=page,
        page_size=page_size,
    )
    return OrderListResponse(
        items=[OrderResponse.model_validate(order) for order in orders],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: ClerkUser = Depends(get_current_user),
    service: OrderService = Depends(get_order_service),
) -> OrderResponse:
    order = await service.get_order(db, order_id, current_user)
    return OrderResponse.model_validate(order)


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: UUID,
    payload: UpdateOrderStatusRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: ClerkUser = Depends(require_admin),
    service: OrderService = Depends(get_order_service),
) -> OrderResponse:
    order = await service.update_status(
        db,
        order_id=order_id,
        next_status=payload.status,
        changed_by=admin_user.id,
    )
    return OrderResponse.model_validate(order)


@router.post("/{order_id}/cancel", response_model=OrderResponse)
@limiter.limit("20/minute")
async def cancel_order(
    request: Request,
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: ClerkUser = Depends(get_current_user),
    service: OrderService = Depends(get_order_service),
) -> OrderResponse:
    order = await service.cancel_order(db, order_id=order_id, current_user=current_user)
    return OrderResponse.model_validate(order)
