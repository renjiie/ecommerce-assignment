import pytest

from app.orders.enums import OrderStatus
from app.orders.exceptions import InvalidTransitionException
from app.orders.service import OrderService


def test_pending_can_transition_to_processing_or_cancelled() -> None:
    OrderService.assert_valid_transition(OrderStatus.PENDING, OrderStatus.PROCESSING)
    OrderService.assert_valid_transition(OrderStatus.PENDING, OrderStatus.CANCELLED)


def test_processing_can_only_transition_to_shipped() -> None:
    OrderService.assert_valid_transition(OrderStatus.PROCESSING, OrderStatus.SHIPPED)

    with pytest.raises(InvalidTransitionException):
        OrderService.assert_valid_transition(OrderStatus.PROCESSING, OrderStatus.CANCELLED)


def test_terminal_statuses_cannot_transition() -> None:
    with pytest.raises(InvalidTransitionException):
        OrderService.assert_valid_transition(OrderStatus.DELIVERED, OrderStatus.CANCELLED)

    with pytest.raises(InvalidTransitionException):
        OrderService.assert_valid_transition(OrderStatus.CANCELLED, OrderStatus.PROCESSING)

