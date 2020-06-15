/*
SPDX-License-Identifier: Apache-2.0
*/

'use strict';

// Utility class for ledger state
const State = require('ledger-api/state.js');

// Enumerate order state values
const orderState = {
    ORDER_CREATED: 1,       //Generator
    ORDER_CONFIRMED:2,
    ORDER_DELIVERED:3,
    ORDER_RECEIVED: 4,      // Customer
    
    ORDER_CLOSED: 5     // Generator
};

/**
 * Order class extends State class
 * Class will be used by application and smart contract to define a Order
 */
class Order extends State {

    constructor(obj) {
        super(Order.getClass(), [obj.orderId]);
        Object.assign(this, obj);
    }

    /*
    Definition:  Class Order:
      {String}  orderId
      {Integer} PowerRate
      {float}   priceRate
      {float} Duration
      {Date} Start
      {Date} End

    */

    /**
     * Basic getters and setters
    */
    getId() {
        return this.orderId;
    }
/*  //  should never be called explicitly;
    //  id is set at the time of constructor call.
    setId(newId) {
        this.id = newId;
    }
*/
    /**
     * Useful methods to encapsulate  Order states
     */
    setStateToOrderCreated() {
        this.currentOrderState = orderState.ORDER_CREATED;

    }

    setStateToOrderReceived() {
        this.currentOrderState = orderState.ORDER_RECEIVED;
    }

    setStateToOrderDelivered() {
        this.currentOrderState = orderState.ORDER_DELIVERED;
    }

    setStateToOrderConfirmed() {
        this.currentOrderState = orderState.ORDER_CONFIRMED;
    }



    setStateToOrderClosed() {
        this.currentOrderState = orderState.ORDER_CLOSED;
    }

    static fromBuffer(buffer) {
        return Order.deserialize(Buffer.from(JSON.parse(buffer)));
    }

    toBuffer() {
        return Buffer.from(JSON.stringify(this));
    }

    /**
     * Deserialize a state data to  Order
     * @param {Buffer} data to form back into the object
     */
    static deserialize(data) {
        return State.deserializeClass(data, Order);
    }

    /**
     * Factory method to create a order object
     */
    static createInstance(orderId) {
        return new Order({orderId});
    }

    static getClass() {
        return 'org.supplychainnet.order';
    }
}

module.exports = Order;
module.exports.orderStates = orderState;