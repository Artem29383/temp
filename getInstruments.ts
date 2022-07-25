import PortfolioAccountFactory from '@core/portfolio/account/PortfolioAccountFactory';
import PortfolioAccountPositionGroup from '@core/portfolio/account/PortfolioAccountPositionGroup';
import PortfolioAccountInstrumentPosition from '@core/portfolio/account/PortfolioAccountInstrumentPosition';
import {PortfolioStateChartAssetsTypes} from '@core/constants/PortfolioConstants';
import {getPositionGroupByAssetType} from '@src/terminal_mobile/pages/portfolio/DataItemFactory';
import {Currency} from '@core/TTConstants';
import PortfolioAccount from '@core/portfolio/account/PortfolioAccount';
import PortfolioAccountFundsPosition from '@core/portfolio/account/PortfolioAccountFundsPosition';

const getPositionItem = (
    portfolioAccount: PortfolioAccount,
    position: PortfolioAccountInstrumentPosition | PortfolioAccountFundsPosition,
) => {
    if (position instanceof PortfolioAccountFundsPosition) {
        return {
            portfolioAccount,
            position,
            key: `funds__${position.currency}`,
            type: 'funds',
        };
    }
    return {
        portfolioAccount,
        position,
        key: `instrument__${position.instrumentId}`,
        type: 'instrument',
    };
};

export const getInstruments = (portfolioAccount) => {
    const items = {
        stock: [] as any,
        etf: [] as any,
        gov: [] as any,
    };
    const instrumentPositions = PortfolioAccountFactory.getPositionGroupsWithMetricsMap(
        portfolioAccount,
        getPositionGroupByAssetType,
    ) as Map<string, PortfolioAccountPositionGroup<PortfolioAccountInstrumentPosition>>;
    [
        PortfolioStateChartAssetsTypes.STOCKS,
        PortfolioStateChartAssetsTypes.BONDS,
        PortfolioStateChartAssetsTypes.ETFS,
    ].forEach((assetType) => {
        const positionsGroup = instrumentPositions.get(assetType);
        if (positionsGroup) {
            const percentFromPortfolioByAssetId = {};
            positionsGroup.items.forEach((position) => {
                percentFromPortfolioByAssetId[position.instrumentId] =
                    PortfolioAccountFactory.getPercentage(
                        portfolioAccount,
                        (p) => (p.valuation.get(Currency.RUB) ?? 0) > 0,
                        (p) =>
                            p instanceof PortfolioAccountInstrumentPosition && p.instrumentId === position.instrumentId,
                    ).get(Currency.RUB) ?? 0;
            });
            const positions = [...positionsGroup.items];
            positions.sort((a, b) => {
                const percentAInstrument = percentFromPortfolioByAssetId[a.instrumentId];
                const percentBInstrument = percentFromPortfolioByAssetId[b.instrumentId];
                if ((a.nfi && !b.nfi) || percentAInstrument < percentBInstrument) return 1;
                if ((!a.nfi && b.nfi) || percentAInstrument > percentBInstrument) return -1;

                return a > b ? -1 : a < b ? 1 : 0;
            });

            positions.forEach((position) => {
                if (position.instrumentType.isCommonStock) {
                    items.stock.push(getPositionItem(portfolioAccount, position));
                }
                if (position.instrumentType.isBond) {
                    items.gov.push(getPositionItem(portfolioAccount, position));
                }
                if (position.instrumentType.isFond) {
                    items.etf.push(getPositionItem(portfolioAccount, position));
                }
            });
        }
    });
    return items;
};
