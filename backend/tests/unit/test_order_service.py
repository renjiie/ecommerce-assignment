from decimal import Decimal
from uuid import uuid4

import pytest

from app.core.security import ClerkUser
from app.orders.enums import OrderStatus
from app.orders.exceptions import ForbiddenException, InvalidTransitionException
from app.orders.models import Order
from app.orders.schemas import OrderItemRequest
from app.orders.service import OrderService


def test_calculates_total_amount_from_order_items() -> None:
    items = [
        OrderItemRequest(product_id=uuid4(), quantity=2, unit_price=Decimal("10.50")),
        OrderItemRequest(product_id=uuid4(), quantity=1, unit_price=Decimal("3.25")),
    ]

    total = OrderService.calculate_total_amount(items)

    assert total == Decimal("24.25")


def test_customer_cannot_access_another_customers_order() -> None:
    user = ClerkUser(id="customer-1", email="customer@example.com", role="CUSTOMER")
    order = Order(
        customer_id="customer-2",
        status=OrderStatus.PENDING,
        total_amount=Decimal("10.00"),
    )

    with pytest.raises(ForbiddenException):
        OrderService.assert_can_access(order, user)


def test_admin_can_access_any_customers_order() -> None:
    admin = ClerkUser(id="admin-1", email="admin@example.com", role="ADMIN")
    order = Order(
        customer_id="customer-2",
        status=OrderStatus.PENDING,
        total_amount=Decimal("10.00"),
    )

    OrderService.assert_can_access(order, admin)


def test_cancel_requires_pending_status() -> None:
    with pytest.raises(InvalidTransitionException):
        OrderService.assert_valid_transition(OrderStatus.PROCESSING, OrderStatus.CANCELLED)
