var request = require('request-promise');
var io = require('socket.io-client');
var db = require('../../db/db');
var Game = require('../../game/game');
var chai = require('chai');
var spies = require('chai-spies');
var rewire = require('rewire');

var sockets = rewire('../setup');
var games = sockets.__get__('games');

var expect = chai.expect;

var URL = 'http://0.0.0.0:5000';

var CLIENT_1, USER_1,
    CLIENT_2, USER_2,
    CLIENT_3, USER_3,
    CLIENT_4, USER_4,
    GAME_ID;

var clearDatabase = function() {
  db.User.get(USER_1.id).delete().run();
  db.User.get(USER_2.id).delete().run();
  db.User.get(USER_3.id).delete().run();
  db.User.get(USER_4.id).delete().run();
};

var closeConnections = function() {
  CLIENT_1.disconnect();
  CLIENT_2.disconnect();
  CLIENT_3.disconnect();
  CLIENT_4.disconnect();
}

var createConnections = function() {
  CLIENT_1 = io.connect(URL, {query: 'gameId=' + GAME_ID + '&user=TEST_USERNAME1'}),
  CLIENT_2 = io.connect(URL, {query: 'gameId=' + GAME_ID + '&user=TEST_USERNAME2'}),
  CLIENT_3 = io.connect(URL, {query: 'gameId=' + GAME_ID + '&user=TEST_USERNAME3'}),
  CLIENT_4 = io.connect(URL, {query: 'gameId=' + GAME_ID + '&user=TEST_USERNAME4'})
}

describe('Socket connection', function () {

  before(function(done) {
    Promise.all([
      request({
        method: 'POST',
        url: 'http://localhost:5000/signup',
        form: {
            name: 'TEST1',
            email: 'TEST_EMAIL1',
            username: 'TEST_USERNAME1',
            password: 'TEST'
        }
      }),
      request({
        method: 'POST',
        url: 'http://localhost:5000/signup',
        form: {
            name: 'TEST2',
            email: 'TEST_EMAIL2',
            username: 'TEST_USERNAME2',
            password: 'TEST'
        }
      }),
      request({
        method: 'POST',
        url: 'http://localhost:5000/signup',
        form: {
            name: 'TEST3',
            email: 'TEST_EMAIL3',
            username: 'TEST_USERNAME3',
            password: 'TEST'
        }
      }),
      request({
        method: 'POST',
        url: 'http://localhost:5000/signup',
        form: {
            name: 'TEST4',
            email: 'TEST_EMAIL4',
            username: 'TEST_USERNAME4',
            password: 'TEST'
        }
      })
    ]).then(function(data){
      data = data.map(user => JSON.parse(user));
      USER_1 = data[0];
      USER_2 = data[1];
      USER_3 = data[2];
      USER_4 = data[3];
      request({
        headers: {
          'x-access-token': USER_1.token
        },
        method: 'POST',
        url: 'http://0.0.0.0:5000/game'
      }).then(function(res) {
        var GAME_ID = res.data;
        done();
      });
    });
  });

  after(function() {
    clearDatabase();
  });

  it('should emit a "joined" event on connect', function (done) {
    // create connections
    createConnections();

    CLIENT_1.on('joined', cb);

    function cb(data) {
      expect(data.username).to.be.equal('TEST_USERNAME1');
      closeConnections();
      done();
    };

  });

  it('should fire a "4players" when joined by 4 players', function (done) {
    createConnections();

    CLIENT_1.on('4players', function(data) {
      expect(data).to.be.equal(GAME_ID);
      closeConnections();
      done()
    });

    CLIENT_1.emit('ready', {id: USER_1.id});
    CLIENT_2.emit('ready', {id: USER_2.id});
    CLIENT_3.emit('ready', {id: USER_3.id});
    CLIENT_4.emit('ready', {id: USER_4.id});
  });

  it('should fire a "" event when joined by 4 players', function(done) {
    createConnections()
    CLIENT_1.on('startGame', function(data) {
      expect(data).to.exist;
      expect(data['matrix']).to.exist;
      expect(data['tilesRemaining']).to.be.equal(54);
      closeConnections();
      done();
    });

    CLIENT_1.emit('ready', {id: USER_1.id});
    CLIENT_2.emit('ready', {id: USER_2.id});
    CLIENT_3.emit('ready', {id: USER_3.id});
    CLIENT_4.emit('ready', {id: USER_4.id});
  });

  it('should fire a "hand" event in response to "readyForHand" with hand and role info', function (done) {
    CLIENT_3.on('hand', function(hand){
      done();
    });
    CLIENT_3.emit('readyForHand', {userId: 'TEST_USER_ID3'});
  });
});
