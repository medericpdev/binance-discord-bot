const Config = require('../../models/Config');

describe('Unit | models | Config', () => {
  describe('#constructor', () => {
    it('should throw an error when token is not provided', () => {
      expect(() => {
        new Config({});
      }).toThrow('Token must be provided');
    });

    it('should throw an error when token is not provided', () => {
      expect(() => {
        new Config({ token: 'token', channelName: undefined });
      }).toThrow('channelName must be provided');
    });
  });

  describe('#addPlayer', () => {
    it('should add player in players, save it and return it', () => {
      // given
      const player = { name: 'foo' };
      const config = new Config({ token: 'token', channelName: 'bot' });
      const expectedSavedUser = { name: 'saved-user' };
      const configRepo = {
        savePlayer: jest.fn(() => expectedSavedUser),
      };

      // when
      const result = config.addPlayer(player, configRepo);

      // then
      expect(config.players[0]).toEqual(expectedSavedUser);
      expect(result).toEqual(expectedSavedUser);
    });

    describe('when user already exists', () => {
      it('should throw an error', () => {
        // given
        const player = { name: 'foo' };
        const config = new Config({
          token: 'token',
          channelName: 'bot',
          players: [player],
        });
        const expectedSavedUser = { name: 'saved-user' };
        const configRepo = {
          savePlayer: jest.fn(() => expectedSavedUser),
        };

        // then
        expect(() => {
          config.addPlayer(player, configRepo);
        }).toThrow('Player with this name already exists');
      });
    });
  });

  describe('#deletePlayer', () => {
    it('should delete player in players and save it', () => {
      // given
      const player = { name: 'foo' };
      const config = new Config({
        token: 'token',
        channelName: 'bot',
        players: [player],
      });
      const configRepo = {
        deletePlayer: jest.fn(),
      };

      // when
      config.deletePlayer(player, configRepo);

      // then
      expect(config.players.length).toEqual(0);
      expect(configRepo.deletePlayer).toHaveBeenCalledWith(player);
    });

    describe('when user does not exists', () => {
      it('should throw an error', () => {
        // given
        const player = { name: 'foo' };
        const config = new Config({
          token: 'token',
          channelName: 'bot',
          players: [],
        });
        const configRepo = {};

        // then
        expect(() => {
          config.deletePlayer(player, configRepo);
        }).toThrow('Player with this name does not exists');
      });
    });
  });

  describe('#updatePlayer', () => {
    it('should update player', () => {
      // given
      const player = { name: 'foo', bet: 10 };
      const config = new Config({
        token: 'token',
        channelName: 'bot',
        players: [player],
      });
      const configRepo = {
        deletePlayer: jest.fn(),
        savePlayer: jest.fn((player) => {
          return player;
        }),
      };

      // when
      const updatedPlayer = { name: 'foo', bet: 25 };
      config.updatePlayer(updatedPlayer, configRepo);

      // then
      expect(config.players.length).toEqual(1);
      expect(config.players[0]).toEqual(updatedPlayer);
    });

    describe('when user does not exists', () => {
      it('should throw an error', () => {
        // given
        const player = { name: 'foo' };
        const config = new Config({
          token: 'token',
          channelName: 'bot',
          players: [],
        });
        const configRepo = {};

        // then
        expect(() => {
          config.updatePlayer(player, configRepo);
        }).toThrow('Player with this name does not exists');
      });
    });
  });
});
