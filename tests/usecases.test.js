const usecases = require('../usecases');
const Config = require('../models/Config');
const Player = require('../models/Player');

describe('Unit | domain | use-cases', () => {
  describe('#addPlayer', () => {
    it('should call config to add player, save and return it', () => {
      // given
      const player = {
        name: 'foo',
        secretKey: 'secret',
        apiKey: 'apiKey',
        bet: 20,
      };

      const config = {
        addPlayer: jest.fn((e) => e.player),
      };

      // when
      const result = usecases.addPlayer({ ...player, config });

      // then
      expect(result).toEqual(new Player(player));
    });
  });

  describe('#deletePlayer', () => {
    it('should call config to delete player', () => {
      // given
      const playerName = 'foo';

      const config = {
        deletePlayer: jest.fn(),
      };

      // when
      usecases.deletePlayer({ playerName, config });

      // then
      expect(config.deletePlayer).toHaveBeenCalledWith({
        player: { name: playerName },
      });
    });
  });

  describe('#updatePlayerBet', () => {
    it('should update player bet', () => {
      // given
      const playerName = 'foo';
      const bet = 20;
      const player = new Player({
        name: 'foo',
        bet: 10,
        apiKey: 'apiKey',
        secretKey: 'secretKey',
      });
      const config = {
        players: [player],
        updatePlayer: jest.fn(),
      };

      // when
      const result = usecases.updatePlayerBet({ playerName, bet, config });

      // then
      expect(result).toEqual({
        message: '**:white_check_mark: foo bet : 10$ -> foo bet : 20$**',
      });
      expect(config.updatePlayer).toHaveBeenCalled();
    });

    describe('when user not exists', () => {
      it('should return error message', () => {
        // given
        const playerName = 'foo';
        const bet = 20;
        const config = {
          players: [],
        };

        // when
        const result = usecases.updatePlayerBet({ playerName, bet, config });

        // then
        expect(result).toEqual({
          message: '**:warning: Player name unknown :warning:**',
        });
      });
    });

    describe('when updateBet throw error', () => {
      it('should return error message', () => {
        // given
        const playerName = 'foo';
        const bet = 20;
        const player = {
          name: 'foo',
          bet: 10,
          setBet: jest.fn().mockImplementation(() => {
            throw new Error('setBet error');
          }),
        };
        const config = {
          players: [player],
        };

        // when
        const result = usecases.updatePlayerBet({ playerName, bet, config });

        // then
        expect(result).toEqual({
          message: '**:warning: setBet error :warning:**',
        });
      });
    });
  });

  describe('#getPlayerBalance', () => {
    it('should return messages with player balance', async () => {
      // given
      const playerName = 'foo';
      const player = {
        name: 'foo',
        getBalanceFutures: jest.fn().mockResolvedValue(200),
        getBalanceSpot: jest.fn().mockResolvedValue({
          cryptos: [{ value: 'bitcoin', amount: 150 }],
          total: 150,
        }),
        bet: 50,
      };
      const config = new Config({
        players: [player],
        token: 'token',
        channelName: 'test',
        showPnlHistory: false,
      });

      // when
      const result = await usecases.getPlayerBalance({ playerName, config });

      // then
      expect(result).toEqual([
        '**Binance Balance :** *** foo *** :arrow_heading_down:',
        ':arrow_forward: Binance Futures = **200$**',
        ':arrow_forward: bitcoin = **150 $**',
        '**:moneybag: Account balance : 350$  :money_with_wings: Bet = 50$  :white_check_mark: Profit = +300$**',
      ]);
    });

    describe('when player does not exists', () => {
      it('should return error message', async () => {
        // given
        const playerName = 'foo';
        const config = new Config({
          players: [],
          token: 'token',
          channelName: 'test',
          showPnlHistory: false,
        });

        // when
        const result = await usecases.getPlayerBalance({ playerName, config });

        // then
        expect(result).toEqual(['**:warning: Player name unknown :warning:**']);
      });
    });

    describe('when player has futures but no spot', () => {
      it('should return error message', async () => {
        // given
        const playerName = 'foo';
        const player = {
          name: 'foo',
          getBalanceFutures: jest.fn().mockResolvedValue(200),
          getBalanceSpot: jest.fn().mockResolvedValue({
            cryptos: [],
            total: 0,
          }),
          bet: 50,
        };
        const config = new Config({
          players: [player],
          token: 'token',
          channelName: 'test',
          showPnlHistory: false,
        });

        // when
        const result = await usecases.getPlayerBalance({ playerName, config });

        // then
        expect(result).toEqual([
          '**Binance Balance :** *** foo *** :arrow_heading_down:',
          ':arrow_forward: Binance Futures = **200$**',
        ]);
      });
    });

    describe('when player has spot but no futures', () => {
      it('should return error message', async () => {
        // given
        const playerName = 'foo';
        const player = {
          name: 'foo',
          getBalanceFutures: jest.fn().mockResolvedValue(0),
          getBalanceSpot: jest.fn().mockResolvedValue({
            cryptos: [{ value: 'bitcoin', amount: 150 }],
            total: 150,
          }),
          bet: 50,
        };
        const config = new Config({
          players: [player],
          token: 'token',
          channelName: 'test',
          showPnlHistory: false,
        });

        // when
        const result = await usecases.getPlayerBalance({ playerName, config });

        // then
        expect(result).toEqual([
          '**Binance Balance :** *** foo *** :arrow_heading_down:',
          ':arrow_forward: bitcoin = **150 $**',
          '**:moneybag: Account balance : 150$  :money_with_wings: Bet = 50$  :white_check_mark: Profit = +100$**',
        ]);
      });
    });

    describe('when player balance is > 0', () => {
      it('should return specific last message', async () => {
        // given
        const playerName = 'foo';
        const player = {
          name: 'foo',
          getBalanceFutures: jest.fn().mockResolvedValue(10),
          getBalanceSpot: jest.fn().mockResolvedValue({
            cryptos: [{ value: 'bitcoin', amount: 150 }],
            total: 150,
          }),
          bet: 50,
        };
        const config = new Config({
          players: [player],
          token: 'token',
          channelName: 'test',
          showPnlHistory: false,
        });

        // when
        const result = await usecases.getPlayerBalance({ playerName, config });

        // then
        expect(result).toEqual([
          '**Binance Balance :** *** foo *** :arrow_heading_down:',
          ':arrow_forward: Binance Futures = **10$**',
          ':arrow_forward: bitcoin = **150 $**',
          '**:moneybag: Account balance : 160$  :money_with_wings: Bet = 50$  :white_check_mark: Profit = +110$**',
        ]);
      });
    });

    describe('when player balance is < 0', () => {
      it('should return specific last message', async () => {
        // given
        const playerName = 'foo';
        const player = {
          name: 'foo',
          getBalanceFutures: jest.fn().mockResolvedValue(10),
          getBalanceSpot: jest.fn().mockResolvedValue({
            cryptos: [{ value: 'bitcoin', amount: 10 }],
            total: 10,
          }),
          bet: 50,
        };
        const config = new Config({
          players: [player],
          token: 'token',
          channelName: 'test',
          showPnlHistory: false,
        });

        // when
        const result = await usecases.getPlayerBalance({ playerName, config });

        // then
        expect(result).toEqual([
          '**Binance Balance :** *** foo *** :arrow_heading_down:',
          ':arrow_forward: Binance Futures = **10$**',
          ':arrow_forward: bitcoin = **10 $**',
          '**:moneybag: Account balance : 20$  :money_with_wings: Bet = 50$  :no_entry_sign: Loss = -30$**',
        ]);
      });
    });
  });

  describe('#getAllPlayersBalance', () => {
    it('should return messages with each player balance', async () => {
      // given
      const player1 = {
        name: 'foo1',
        getBalanceFutures: jest.fn().mockResolvedValue(200),
        getBalanceSpot: jest.fn().mockResolvedValue({
          cryptos: [{ value: 'bitcoin', amount: 150 }],
          total: 150,
        }),
        bet: 50,
      };
      const player2 = {
        name: 'foo2',
        getBalanceFutures: jest.fn().mockResolvedValue(10),
        getBalanceSpot: jest.fn().mockResolvedValue({
          cryptos: [{ value: 'bitcoin', amount: 10 }],
          total: 10,
        }),
        bet: 50,
      };
      const config = {
        players: [player1, player2],
      };

      // when
      const result = await usecases.getAllPlayersBalance({ config });

      // then
      expect(result).toEqual([
        ':white_check_mark: **+300$** - **foo1** (**350$**)',
        ':no_entry_sign: **-30$** - **foo2** (**20$**)',
      ]);
    });
  });
});
