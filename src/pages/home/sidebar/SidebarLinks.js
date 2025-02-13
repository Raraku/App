import React from 'react';
import {View, TouchableOpacity} from 'react-native';
import _ from 'underscore';
import PropTypes from 'prop-types';
import {withOnyx} from 'react-native-onyx';
import styles, {getSafeAreaMargins} from '../../../styles/styles';
import ONYXKEYS from '../../../ONYXKEYS';
import safeAreaInsetPropTypes from '../../safeAreaInsetPropTypes';
import compose from '../../../libs/compose';
import Navigation from '../../../libs/Navigation/Navigation';
import ROUTES from '../../../ROUTES';
import Icon from '../../../components/Icon';
import Header from '../../../components/Header';
import OptionsList from '../../../components/OptionsList';
import {MagnifyingGlass} from '../../../components/Icon/Expensicons';
import AvatarWithIndicator from '../../../components/AvatarWithIndicator';
import {getSidebarOptions, getDefaultAvatar} from '../../../libs/OptionsListUtils';
import KeyboardSpacer from '../../../components/KeyboardSpacer';
import Tooltip from '../../../components/Tooltip';
import CONST from '../../../CONST';
import {participantPropTypes} from './optionPropTypes';
import themeColors from '../../../styles/themes/default';
import withLocalize, {withLocalizePropTypes} from '../../../components/withLocalize';
import * as App from '../../../libs/actions/App';

const propTypes = {
    /** Toggles the navigation menu open and closed */
    onLinkClick: PropTypes.func.isRequired,

    /** Navigates to settings and hides sidebar */
    onAvatarClick: PropTypes.func.isRequired,

    /** Safe area insets required for mobile devices margins */
    insets: safeAreaInsetPropTypes.isRequired,

    /* Onyx Props */
    /** List of reports */
    reports: PropTypes.objectOf(PropTypes.shape({
        reportID: PropTypes.number,
        reportName: PropTypes.string,
        unreadActionCount: PropTypes.number,
    })),

    /** List of draft comments. We don't know the shape, since the keys include the report numbers */
    draftComments: PropTypes.objectOf(PropTypes.string),

    /** List of users' personal details */
    personalDetails: PropTypes.objectOf(participantPropTypes),

    /** The personal details of the person who is logged in */
    myPersonalDetails: PropTypes.shape({
        /** Display name of the current user from their personal details */
        displayName: PropTypes.string,

        /** Avatar URL of the current user from their personal details */
        avatar: PropTypes.string,
    }),

    /** Information about the network */
    network: PropTypes.shape({
        /** Is the network currently offline or not */
        isOffline: PropTypes.bool,
    }),

    /** Currently viewed reportID */
    currentlyViewedReportID: PropTypes.string,

    /** Whether we are viewing below the responsive breakpoint */
    isSmallScreenWidth: PropTypes.bool.isRequired,

    /** The chat priority mode */
    priorityMode: PropTypes.string,

    /** Whether we have the necessary report data to load the sidebar */
    initialReportDataLoaded: PropTypes.bool,

    // Whether we are syncing app data
    isSyncingData: PropTypes.bool,

    ...withLocalizePropTypes,
};

const defaultProps = {
    reports: {},
    draftComments: {},
    personalDetails: {},
    myPersonalDetails: {
        avatar: getDefaultAvatar(),
    },
    network: null,
    currentlyViewedReportID: '',
    priorityMode: CONST.PRIORITY_MODE.DEFAULT,
    initialReportDataLoaded: false,
    isSyncingData: false,
};

class SidebarLinks extends React.Component {
    shouldComponentUpdate(nextProps) {
        // We do not want to re-order reports in the LHN if the only change is the draft comment in the
        // current report.

        // We don't need to limit draft comment flashing for small screen widths as LHN is not visible.
        if (nextProps.isSmallScreenWidth) {
            return true;
        }

        const didActiveReportChange = this.props.currentlyViewedReportID !== nextProps.currentlyViewedReportID;

        // Always re-order the list whenever the active report is changed
        if (didActiveReportChange) {
            return true;
        }

        const previousDraftComments = this.props.draftComments;
        const nextDraftComments = nextProps.draftComments;

        const previousDraftReports = Object.keys(previousDraftComments);
        const nextDraftReports = Object.keys(nextDraftComments);

        const reportsWithNewDraftComments = nextDraftReports.filter((report) => {
            const isNewDraftComment = !previousDraftReports.includes(report);
            const wasNonEmptyDraftComment = previousDraftComments[report] === '';
            const hasDraftCommentChanged = previousDraftComments[report] !== nextDraftComments[report];

            return isNewDraftComment || (hasDraftCommentChanged && wasNonEmptyDraftComment);
        });
        const reportsWithRemovedDraftComments = previousDraftReports.filter((report) => {
            const isRemovedDraftComment = !nextDraftReports.includes(report);
            const isEmptyDraftComment = nextDraftComments[report] === '';
            const hasDraftCommentChanged = previousDraftComments[report] !== nextDraftComments[report];

            return isRemovedDraftComment || (hasDraftCommentChanged && isEmptyDraftComment);
        });
        const reportsWithEditedDraftComments = nextDraftReports.filter((report) => {
            const didDraftCommentExistPreviously = previousDraftReports.includes(report);
            const hasDraftCommentChanged = previousDraftComments[report] !== nextDraftComments[report];
            const isNotANewDraftComment = !reportsWithNewDraftComments.includes(report);
            const isNotARemovedDraftComment = !reportsWithRemovedDraftComments.includes(report);

            return didDraftCommentExistPreviously && hasDraftCommentChanged && isNotANewDraftComment && isNotARemovedDraftComment;
        });

        const allReportsWithDraftCommentChanges = [
            ...reportsWithNewDraftComments,
            ...reportsWithRemovedDraftComments,
            ...reportsWithEditedDraftComments,
        ];

        const activeReportID = this.props.currentlyViewedReportID;
        const reportKey = `${ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT}${activeReportID}`;

        // Do not re-order reports if draft comment changes are only in the current report.
        if (allReportsWithDraftCommentChanges.length === 1 && allReportsWithDraftCommentChanges.includes(reportKey)) {
            return false;
        }
        return true;
    }

    showSearchPage() {
        Navigation.navigate(ROUTES.SEARCH);
    }

    render() {
        // Wait until the reports and personalDetails are actually loaded before displaying the LHN
        if (!this.props.initialReportDataLoaded || _.isEmpty(this.props.personalDetails)) {
            return null;
        }

        const activeReportID = parseInt(this.props.currentlyViewedReportID, 10);

        const {recentReports} = getSidebarOptions(
            this.props.reports,
            this.props.personalDetails,
            this.props.draftComments,
            activeReportID,
            this.props.priorityMode,
            this.props.betas,
        );

        const sections = [{
            title: '',
            indexOffset: 0,
            data: recentReports,
            shouldShow: true,
        }];

        return (
            <View style={[styles.flex1, styles.h100]}>
                <View
                    style={[
                        styles.flexRow,
                        styles.ph5,
                        styles.pv3,
                        styles.justifyContentBetween,
                        styles.alignItemsCenter,
                    ]}
                    nativeID="drag-area"
                >
                    <Header
                        textSize="large"
                        title={this.props.translate('sidebarScreen.headerChat')}
                        accessibilityLabel={this.props.translate('sidebarScreen.headerChat')}
                        accessibilityRole="text"
                        shouldShowEnvironmentBadge
                    />
                    <Tooltip text={this.props.translate('common.search')}>
                        <TouchableOpacity
                            accessibilityLabel={this.props.translate('sidebarScreen.buttonSearch')}
                            accessibilityRole="button"
                            style={[styles.flexRow, styles.ph5]}
                            onPress={this.showSearchPage}
                        >
                            <Icon src={MagnifyingGlass} />
                        </TouchableOpacity>
                    </Tooltip>
                    <TouchableOpacity
                        accessibilityLabel={this.props.translate('sidebarScreen.buttonMySettings')}
                        accessibilityRole="button"
                        onPress={this.props.onAvatarClick}
                    >
                        <AvatarWithIndicator
                            source={this.props.myPersonalDetails.avatar}
                            isActive={this.props.network && !this.props.network.isOffline}
                            isSyncing={this.props.network && !this.props.network.isOffline && this.props.isSyncingData}
                            tooltipText={this.props.myPersonalDetails.displayName}
                        />
                    </TouchableOpacity>
                </View>
                <OptionsList
                    contentContainerStyles={[
                        styles.sidebarListContainer,
                        {paddingBottom: getSafeAreaMargins(this.props.insets).marginBottom},
                    ]}
                    sections={sections}
                    focusedIndex={_.findIndex(recentReports, (
                        option => option.reportID === activeReportID
                    ))}
                    onSelectRow={(option) => {
                        Navigation.navigate(ROUTES.getReportRoute(option.reportID));
                        this.props.onLinkClick();
                    }}
                    optionBackgroundColor={themeColors.sidebar}
                    hideSectionHeaders
                    showTitleTooltip
                    disableFocusOptions={this.props.isSmallScreenWidth}
                    optionMode={this.props.priorityMode === CONST.PRIORITY_MODE.GSD ? 'compact' : 'default'}
                    onLayout={App.setSidebarLoaded}
                />
                <KeyboardSpacer />
            </View>
        );
    }
}

SidebarLinks.propTypes = propTypes;
SidebarLinks.defaultProps = defaultProps;

export default compose(
    withLocalize,
    withOnyx({
        reports: {
            key: ONYXKEYS.COLLECTION.REPORT,
        },
        draftComments: {
            key: ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT,
        },
        personalDetails: {
            key: ONYXKEYS.PERSONAL_DETAILS,
        },
        myPersonalDetails: {
            key: ONYXKEYS.MY_PERSONAL_DETAILS,
        },
        network: {
            key: ONYXKEYS.NETWORK,
        },
        currentlyViewedReportID: {
            key: ONYXKEYS.CURRENTLY_VIEWED_REPORTID,
        },
        priorityMode: {
            key: ONYXKEYS.NVP_PRIORITY_MODE,
        },
        initialReportDataLoaded: {
            key: ONYXKEYS.INITIAL_REPORT_DATA_LOADED,
        },
        isSyncingData: {
            key: ONYXKEYS.IS_LOADING_AFTER_RECONNECT,
        },
        betas: {
            key: ONYXKEYS.BETAS,
        },
    }),
)(SidebarLinks);
