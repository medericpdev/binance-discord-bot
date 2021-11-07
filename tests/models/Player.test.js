const Player = require('../../models/Player');

describe('Unit | models | Player', () => {
  describe('#constructor', () => {
    [
      { player: { name: undefined }, errorValue: 'name' },
      { player: { name: 'name', apiKey: undefined }, errorValue: 'apiKey' },
      {
        player: { name: 'name', apiKey: 'apiKey', secretKey: undefined },
        errorValue: 'secretKey',
      },
      {
        player: {
          name: 'name',
          apiKey: 'apiKey',
          secretKey: 'secretKey',
          bet: undefined,
        },
        errorValue: 'bet',
      },
    ].forEach((testCase) => {
      it(`should throw an error when ${testCase.errorValue} is not provided`, () => {
        expect(() => {
          new Player(testCase.player);
        }).toThrow(`${testCase.errorValue} must be provided`);
      });
    });

    it('should throw an error when bet is not a number', () => {
      const player = {
        name: 'name',
        apiKey: 'apiKey',
        secretKey: 'secretKey',
        bet: 'text',
      };

      expect(() => {
        new Player(player);
      }).toThrow('bet must be a number');
    });
  });

  describe('#setBet', () => {
    it('should set bet', () => {
      // given
      const player = new Player({
        name: 'foo',
        secretKey: 'secret',
        apiKey: 'apiKey',
        bet: 10,
      });
      const config = {
        updatePlayer: jest.fn(),
      };

      // when
      player.setBet(20, config);

      // then
      expect(player.bet).toEqual(20);
      expect(config.updatePlayer).toHaveBeenCalled();
    });

    describe('when bet is not a number', () => {
      it('should throw an error', () => {
        // given
        const player = new Player({
          name: 'foo',
          secretKey: 'secret',
          apiKey: 'apiKey',
          bet: 10,
        });
        const config = {
          updatePlayer: jest.fn(),
        };

        // when
        expect(() => {
          player.setBet('20$', config);
        }).toThrow('bet must be a number');
      });
    });
  });
});
