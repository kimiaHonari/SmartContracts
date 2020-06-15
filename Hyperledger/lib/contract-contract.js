/*
SPDX-License-Identifier: Apache-2.0
*/

'use strict';

// Fabric smart contract classes
const { Contract, Context } = require('fabric-contract-api');

// supplychainnet specifc classes
const Order = require('./order.js');
const OrderStates = require('./order.js').orderStates;





/**
 * A custom context provides easy access to list of all products
 */
class PowerContext extends Context {
    constructor() {
        super();
    }
}
//  EVENT
const EVENT_TYPE = "bcpocevent";
/**
 * Define product smart contract by extending Fabric Contract class
 */
class PowerContract extends Contract {

    constructor() {
        // Unique namespace when multiple contracts per chaincode file
        super('org.power.contract');
    }

    /**
     * Define a custom context 
    */
    createContext() {
        return new PowerContext();
    }

    /**
     * Instantiate to perform any setup of the ledger that might be required.
     * @param {Context} ctx the transaction context
     */
    async init(ctx) {
        // No implementation required with this example
        // It could be where data migration is performed, if necessary
        console.log('Instantiate the contract');
    }

    /**
     * order

     *
     * @param {Context} ctx the transaction context
     * @param {String} orderId
     * @param {Intege} PoweRate
     * @param {float} PriceRate
     * @param {float} Duration 
     * @param {Date} Start
     * @param {Date} End

    */
    async CreateContract(ctx, args) {

        // Access Control: This transaction should only be invoked by a Generator
        let userType = await this.getCurrentUserType(ctx);
        

        if ((userType != "admin"))
            throw new Error(`This user does not have access to create an order`);

        const order_details = JSON.parse(args);
        const orderId = order_details.orderId;

        console.log("incoming asset fields: " + JSON.stringify(order_details));
        
        // Check if an order already exists with id=orderId
        var orderAsBytes = await ctx.stub.getState(orderId);
        if (orderAsBytes && orderAsBytes.length > 0) {
            throw new Error(`Error Message from orderPower. Order with orderId = ${orderId} already exists.`);
        }

        // Create a new Order object
        let order = Order.createInstance(orderId);
        order.PriceRate = order_details.PriceRate;
        order.PoweRate = order_details.PoweRate;
        order.Duration = order_details.Duration;
        order.Start = order_details.Start;
        order.End = order_details.End;
        order.GenratorId=await this.getCurrentUserId(ctx);
        order.modifiedBy = await this.getCurrentUserId(ctx);
        order.currentOrderState = OrderStates.ORDER_CREATED;
        

        // Update ledger
        await ctx.stub.putState(orderId, order.toBuffer());

        // Define and set event
        const event_obj = order;
        event_obj.event_type = "createOrder";   //  add the field "event_type" for the event to be processed
 
        try {
            await ctx.stub.setEvent(EVENT_TYPE, event_obj.toBuffer());
        }
        catch (error) {
            console.log("Error in sending event");
        }
        finally {
            console.log("Attempted to send event = ", order);
        }

        // Must return a serialized order to caller of smart contract
        return order.toBuffer();
    }

/**
      * ConfirmOrder
      *
      * @param {Context} ctx the transaction context
      * @param {String}  orderId
     */
    async ConfirmOrder(ctx,orderId){

        if (orderId.length < 1) {
            throw new Error('orderId is required as input')
        }

        // Retrieve the current order using key provided
        var orderAsBytes = await ctx.stub.getState(orderId);
        if (!orderAsBytes || orderAsBytes.length === 0) {
            throw new Error(`Error Message from ConfirmOrder: Order with orderId = ${orderId} does not exist.`);
        }

         // Convert order so we can modify fields
         var order = Order.deserialize(orderAsBytes);

         // Access Control: This transaction should only be invoked by designated Producer
         let userId = await this.getCurrentUserId(ctx);
 
         if ((userId != "admin") )// admin only has access as a precaution.
             throw new Error(`${userId} does not have access to receive order ${orderId}`);
 
         // Change currentOrderState
         order.setStateToOrderConfirmed();
         order.CustomerId=userId;
         // Track who is invoking this transaction
         order.modifiedBy = userId;
 
         // Update ledger
         await ctx.stub.putState(orderId, order.toBuffer());
 
         // Must return a serialized order to caller of smart contract
         return order.toBuffer();

    }

/**
      * setDeliveredpower
      *
      * @param {Context} ctx the transaction context
      * @param {String}  orderId
      * @param {float}   powerValue
     */
    async OrderDelivered(ctx, orderId,powerValue){
        if (orderId.length < 1) {
            throw new Error('orderId is required as input')
        }

        // Retrieve the current order using key provided
        var orderAsBytes = await ctx.stub.getState(orderId);
        if (!orderAsBytes || orderAsBytes.length === 0) {
            throw new Error(`Error Message from ConfirmOrder: Order with orderId = ${orderId} does not exist.`);
        }

         // Convert order so we can modify fields
         var order = Order.deserialize(orderAsBytes);

         // Access Control: This transaction should only be invoked by designated Producer
         let userId = await this.getCurrentUserId(ctx);
 
         if ((userId != "admin") && (userId!=order.GenratorId))// admin only has access as a precaution.
             throw new Error(`${userId} does not have access to receive order ${orderId}`);
 
         // Change currentOrderState
         order.setStateToOrderDelivered();
         order.PowerRecived=powerValue;
         // Track who is invoking this transaction
         order.modifiedBy = userId;
 
         // Update ledger
         await ctx.stub.putState(orderId, order.toBuffer());
 
         // Must return a serialized order to caller of smart contract
         return order.toBuffer();

    }

    /**
      * receiveOrder

      *
      * @param {Context} ctx the transaction context
      * @param {String}  orderId
      * @param {float}   powerValue
     */
    async receivedOrder(ctx, orderId,powerValue) {
        console.info('============= receiveOrder ===========');

        if (orderId.length < 1) {
            throw new Error('orderId is required as input')
        }

        // Retrieve the current order using key provided
        var orderAsBytes = await ctx.stub.getState(orderId);
        if (!orderAsBytes || orderAsBytes.length === 0) {
            throw new Error(`Error Message from receiveOrder: Order with orderId = ${orderId} does not exist.`);
        }

        // Convert order so we can modify fields
        var order = Order.deserialize(orderAsBytes);

        // Access Control: This transaction should only be invoked by designated Producer
        let userId = await this.getCurrentUserId(ctx);

        if ((userId != "admin") && // admin only has access as a precaution.
            (userId != order.CustomerId))
            throw new Error(`${userId} does not have access to receive order ${orderId}`);

        // Change currentOrderState
        order.setStateToOrderReceived();

        // Track who is invoking this transaction
        order.modifiedBy = userId;

        // Update ledger
        await ctx.stub.putState(orderId, order.toBuffer());

        // Must return a serialized order to caller of smart contract
        return order.toBuffer();
    }



    async deleteOrder(ctx, orderId) {

        console.info('============= deleteOrder ===========');
        if (orderId.length < 1) {
            throw new Error('Order Id required as input')
        }
        console.log("orderId = " + orderId);

        // Retrieve the current order using key provided
        var orderAsBytes = await ctx.stub.getState(orderId);

        if (!orderAsBytes || orderAsBytes.length === 0) {
            throw new Error(`Error Message from deleteOrder: Order with orderId = ${orderId} does not exist.`);
        }

        // Access Control: This transaction should only be invoked by designated originating Retailer or Producer
        var order = Order.deserialize(orderAsBytes);
        let userId = await this.getCurrentUserId(ctx);

        if ((userId != "admin") // admin only has access as a precaution.
            && (userId != order.retailerId) // This transaction should only be invoked by Producer or Retailer of order
            && (userId != order.producerId))
            throw new Error(`${userId} does not have access to delete order ${orderId}`);

        await ctx.stub.deleteState(orderId); //remove the order from chaincode state
    }

    /**
      * getCurrentUserId
      * To be called by application to get the type for a user who is logged in
      *
      * @param {Context} ctx the transaction context
      * Usage:  getCurrentUserId ()
     */
    async getCurrentUserId(ctx) {

        let id = [];
        id.push(ctx.clientIdentity.getID());
        var begin = id[0].indexOf("/CN=");
        var end = id[0].lastIndexOf("::/C=");
        let userid = id[0].substring(begin + 4, end);
        return userid;
    }

    /**
      * getCurrentUserType
      * To be called by application to get the type for a user who is logged in
      *
      * @param {Context} ctx the transaction context
      * Usage:  getCurrentUserType ()
     */
    async getCurrentUserType(ctx) {

        let userid = await this.getCurrentUserId(ctx);

        //  check user id;  if admin, return type = admin;
        //  else return value set for attribute "type" in certificate;
        if (userid == "admin") {
            return userid;
        }
        return ctx.clientIdentity.getAttributeValue("usertype");
    }
}  //  Class SupplychainContract

module.exports = SupplychainContract;