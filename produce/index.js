const Amqp = require('../amqp');
const util = require('util');
const opts = {contentType: 'application/json'};

module.exports = function(...params) {
    let parent = Amqp(...params);

    function ProduceAmqpPort() {
        parent && parent.apply(this, arguments);

        this.config = this.merge({
            id: 'produce',
            logLevel: 'debug',
            config: {},
            context: {}
        }, this.config);
    }

    ProduceAmqpPort.prototype.send = function(exchange, routingKey, payload, options) {
        let config = this.config.exchange[exchange];
        const mergedOptions = { ...opts, ...options };

        return this.channel.assertExchange(exchange, config.type, config.opts)
            .then(r => {
                return this.channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(payload)), mergedOptions);
            });
    }

    ProduceAmqpPort.prototype.exec = function(params, $meta) {
        if ($meta.method === 'producer.send') {
            const { exchange, routingKey, payload, options } = { ...params };
            return this.send({exchange, routingKey, payload, options});
        }

        let [exchange, routingKey] = $meta.method.split('.').slice(1, 3);
        let config = this.config.exchange[exchange];

        if (this.channel === null) {
            return;
        }

        return this.channel.assertExchange(exchange, config.type, config.opts)
            .then(r => {
                return this.channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(params)), opts);
            });
    };

    if (parent) {
        util.inherits(ProduceAmqpPort, parent);
    }

    return ProduceAmqpPort;
};
