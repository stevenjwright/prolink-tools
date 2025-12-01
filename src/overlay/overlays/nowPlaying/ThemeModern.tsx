import React from 'react';
import {Disc, X} from 'react-feather';
import styled from '@emotion/styled';
import {formatDistance} from 'date-fns';
import {AnimatePresence, motion} from 'framer-motion';
import {toJS} from 'mobx';
import {observer} from 'mobx-react';

import TimeTicker from 'src/shared/components/TimeTicker';
import {PlayedTrack} from 'src/shared/store';
import {idTrack} from 'src/utils/dummyData';

import {Tags, tagsConfig} from './tags';
import {ThemeComponentProps, ThemeDescriptor} from '.';

const artToSrc = (d: Uint8Array | undefined) =>
  d && d.length > 0
    ? `data:image/jpg;base64,${window.btoa(String.fromCharCode(...d))}`
    : undefined;

type MotionDivProps = React.ComponentProps<typeof motion.div>;

type OrientedMotionDivProps = MotionDivProps & {
  alignRight?: boolean;
};

const defaultColors = {
  '--pt-np-primary-text': '#fff',
  '--pt-np-primary-bg': 'rgba(0, 0, 0, 0.25)',
  '--pt-np-empty-attrs-text': 'rgba(255, 255, 255, 0.6)',
  '--pt-np-empty-art-bg': '#28272b',
  '--pt-np-empty-art-icon': '#aaa',
};

const cssVar = (name: keyof typeof defaultColors) =>
  `var(${name}, ${defaultColors[name]})`;

const BeatportIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="50%" height="50%" viewBox="0 0 22 28" fill="none">
    <path d="M22 19.8977C21.9962 21.2183 21.6783 22.5181 21.0738 23.6845C20.4691 24.8508 19.596 25.8488 18.5301 26.5919C17.4641 27.3348 16.2374 27.8006 14.9561 27.9487C13.6748 28.0968 12.3777 27.9229 11.1768 27.442C9.97588 26.961 8.90752 26.1876 8.06422 25.1886C7.2209 24.1896 6.6281 22.9952 6.33699 21.7086C6.04592 20.4222 6.06538 19.0824 6.39366 17.8053C6.72198 16.5282 7.34925 15.3523 8.22116 14.3795L2.82452 19.8977L0 17.0049L6.06685 10.8626C6.46673 10.4536 6.78283 9.96689 6.99656 9.43114C7.21034 8.89538 7.31739 8.32122 7.31156 7.74244V0H11.2894V7.71569C11.307 8.8329 11.1009 9.94202 10.684 10.9746C10.2672 12.0073 9.64813 12.9415 8.86527 13.7198L8.68683 13.9025C9.82565 12.8426 11.2401 12.1436 12.7587 11.8899C14.2774 11.6362 15.8353 11.8388 17.2439 12.4732C18.6525 13.1075 19.8515 14.1463 20.6956 15.464C21.5396 16.7817 21.9927 18.3217 22 19.8977ZM18.3964 19.8977C18.405 19.0142 18.1571 18.1481 17.6842 17.4093C17.2112 16.6704 16.5346 16.0921 15.7402 15.7479C14.9457 15.4037 14.0693 15.3091 13.2222 15.4761C12.3751 15.6429 11.5957 16.0639 10.9826 16.6855C10.3695 17.307 9.95069 18.1012 9.77925 18.967C9.60778 19.8328 9.69139 20.7313 10.0194 21.5485C10.3476 22.3655 10.9053 23.0643 11.6219 23.5561C12.3385 24.0478 13.1817 24.3105 14.0443 24.3105C14.6136 24.3158 15.1783 24.2056 15.7058 23.9862C16.2333 23.7669 16.7133 23.4428 17.1179 23.0326C17.5225 22.6223 17.8436 22.1341 18.0632 21.596C18.2826 21.0579 18.3959 20.4808 18.3964 19.8977Z" fill="currentColor"/>
  </svg>
);

type MissingArtworkProps = MotionDivProps & {
  artworkIcon?: 'default' | 'beatport';
};

const MissingArtwork = styled((p: MissingArtworkProps) => {
  const {artworkIcon, ...motionProps} = p;
  return (
    <motion.div {...motionProps}>
      {artworkIcon === 'beatport' ? <BeatportIcon /> : <Disc size="50%" />}
    </motion.div>
  );
})`
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${cssVar('--pt-np-empty-art-bg')};
  color: ${cssVar('--pt-np-empty-art-icon')};
  opacity: 1;
`;

type ArtworkProps = {alignRight?: boolean; animateIn: boolean; artworkIcon?: 'default' | 'beatport'} & (
  | ({src: string} & React.ComponentProps<typeof motion.img>)
  | ({src: undefined} & React.HTMLAttributes<HTMLImageElement>)
);

const BaseArtwork = ({animateIn, alignRight, artworkIcon, ...p}: ArtworkProps) => {
  const animation = {
    initial: {
      clipPath: !animateIn
        ? 'inset(0% 0% 0% 0%)'
        : alignRight
        ? 'inset(0% 0% 0% 100%)'
        : 'inset(0% 100% 0% 0%)',
    },
    animate: {
      clipPath: 'inset(0% 0% 0% 0%)',
      transitionEnd: {zIndex: 1},
    },
    exit: {
      clipPath: 'inset(0% 0% 100% 0%)',
    },
  };

  return p.src !== undefined ? (
    <motion.img variants={animation} {...p} />
  ) : (
    <MissingArtwork artworkIcon={artworkIcon} variants={animation} className={p.className} />
  );
};

const Artwork = styled(BaseArtwork)<ArtworkProps & {size: string}>`
  display: flex;
  height: ${p => p.size};
  width: ${p => p.size};
  border-radius: 3px;
  flex-shrink: 0;
`;

Artwork.defaultProps = {
  className: 'track-artwork',
};

const Text = styled(motion.div)`
  background: ${cssVar('--pt-np-primary-bg')};
  padding: 0 0.28em;
  border-radius: 1px;
  display: inline-block;
  margin-left: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`;

Text.defaultProps = {
  variants: {
    initial: {opacity: 0, x: -20},
    animate: {opacity: 1, x: 0},
    exit: {x: 0},
  },
};

const Title = styled(Text)`
  font-weight: 600;
  font-size: 1.3em;
  line-height: 1.4;
  margin-bottom: 0.2em;
`;

Title.defaultProps = {
  ...Text.defaultProps,
  className: 'metadata-title',
};

const Artist = styled(Text)`
  font-size: 1.1em;
  line-height: 1.3;
  margin-bottom: 0.2em;
`;

Artist.defaultProps = {
  ...Text.defaultProps,
  className: 'metadata-artist',
};

const Attributes = styled(({alignRight, ...p}: OrientedMotionDivProps) => {
  const animation = {
    animate: {
      x: 0,
      transition: {
        when: 'beforeChildren',
        staggerChildren: 0.2,
        staggerDirection: alignRight ? -1 : 1,
      },
    },
  };
  return <motion.div variants={animation} {...p} />;
})`
  display: flex;
  font-size: 0.9em;
  line-height: 1.4;
  margin-top: 0.1em;
  // Set nowrap to fix a layout bug that occurse when the element is FLIPed in
  // pose during the animation.
  white-space: nowrap;
`;

Attributes.defaultProps = {
  className: 'metadata-attributes',
};

type IconProps = {
  icon: React.ComponentType<React.ComponentProps<typeof Disc>>;
  className?: string;
};

const Icon = styled((p: IconProps) => <p.icon className={p.className} size="1em" />)`
  margin-right: 0.25em;
  vertical-align: text-top;
`;

type AttributeProps = React.ComponentProps<typeof Text> & {
  icon: IconProps['icon'];
  text?: string;
};

const Attribute = ({icon, text, ...p}: AttributeProps) =>
  text === '' || text === undefined ? null : (
    <Text {...p}>
      <Icon icon={icon} />
      {text}
    </Text>
  );

const NoAttributes = styled((p: Omit<AttributeProps, 'text' | 'icon'>) => (
  <Attribute text="No Release Metadata" icon={X} {...p} />
))`
  color: ${cssVar('--pt-np-empty-attrs-text')};
`;

const MetadataWrapper = styled((p: OrientedMotionDivProps) => {
  const variants = {
    initial: {
      clipPath: 'inset(0% 100% 0% 0%)',
    },
    animate: {
      clipPath: 'inset(0% 0% 0% 0%)',
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.15,
      },
    },
    exit: {
      clipPath: p.alignRight ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)',
      transition: {
        duration: 0.2,
      },
    },
  };

  return <motion.div variants={variants} {...p} />;
})<{alignRight?: boolean}>`
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: ${p => (p.alignRight ? 'flex-end' : 'flex-start')};
`;

MetadataWrapper.defaultProps = {
  className: 'track-metadata',
};

type FullMetadataProps = OrientedMotionDivProps & {
  track: PlayedTrack['track'];
  tags: Tags;
};

const FullMetadata = ({track, tags, ...p}: FullMetadataProps) => (
  <MetadataWrapper {...p}>
    <Title>{track.title}</Title>
    <Artist>{track.artist?.name}</Artist>
    <Attributes alignRight={p.alignRight}>
      {tags.map(tag => {
        const {icon, getter} = tagsConfig[tag];
        const text = getter(track);
        return <Attribute key={tag} className={`attribute-${tag}`} {...{icon, text}} />;
      })}
      {tags.map(t => tagsConfig[t].getter(track)).join('') === '' && tags.length > 0 && (
        <NoAttributes key="no-field" />
      )}
    </Attributes>
  </MetadataWrapper>
);

type BaseTrackProps = MotionDivProps & {
  played: PlayedTrack;
  alignRight?: boolean;
  hideArtwork?: boolean;
  /**
   * Enables animation of the artwork
   */
  firstPlayed?: boolean;
  /**
   * The list of tags to show on the 3rd row
   */
  tags?: Tags;
  /**
   * The string used to mask ID tracks. Blank if ID masks are disabled
   */
  idMask?: string;
  /**
   * The font family to use
   */
  fontFamily?: string;
  /**
   * The artwork icon to use when artwork is missing
   */
  artworkIcon?: 'default' | 'beatport';
};

const FullTrack = ({
  played,
  firstPlayed,
  hideArtwork,
  idMask,
  ...props
}: BaseTrackProps) => (
  <TrackContainer fontFamily={props.fontFamily} {...props}>
    {!hideArtwork && (
      <Artwork
        alignRight={props.alignRight}
        animateIn={!!firstPlayed}
        artworkIcon={props.artworkIcon}
        src={artToSrc(played.artwork)}
        size="80px"
      />
    )}
    <FullMetadata
      alignRight={props.alignRight}
      track={played.metadataIncludes(idMask) ? idTrack : played.track}
      tags={props.tags ?? []}
    />
  </TrackContainer>
);

const TrackContainer = styled(motion.div)<{alignRight?: boolean; fontFamily?: string}>`
  display: inline-grid;
  grid-gap: 0.5rem;
  color: ${cssVar('--pt-np-primary-text')};
  font-family: ${p =>
    p.fontFamily === 'beatport' ? "'Aeonik BP Live', sans-serif" : 'Ubuntu, sans-serif'};
  justify-content: ${p => (p.alignRight ? 'right' : 'left')};
  grid-template-columns: ${p =>
    p.alignRight
      ? 'minmax(0, max-content) max-content'
      : 'max-content minmax(0, max-content)'};

  > *:nth-child(1) {
    grid-row: 1;
    grid-column: ${p => (p.alignRight ? 2 : 1)};
  }
  > *:nth-child(2) {
    grid-row: 1;
    grid-column: ${p => (p.alignRight ? 1 : 2)};
  }
`;

TrackContainer.defaultProps = {
  animate: 'animate',
  initial: 'initial',
  exit: 'exit',
};

const MiniTitle = styled(Text)`
  font-size: 0.85em;
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: 0.15em;
`;

const MiniArtist = styled(Text)`
  font-size: 0.8em;
  line-height: 1.2;
  margin-bottom: 0.25em;
`;

const PlayedAt = styled(Text)`
  font-size: 0.7em;
  line-height: 1.3;
`;

const MiniTrack = ({
  played,
  hideArtwork,
  idMask,
  ...props
}: BaseTrackProps) => {
  const track = played.metadataIncludes(idMask) ? idTrack : played.track;

  return (
    <TrackContainer fontFamily={props.fontFamily} {...props}>
      {!hideArtwork && (
        <Artwork
          animateIn
          alignRight={props.alignRight}
          artworkIcon={props.artworkIcon}
          src={artToSrc(played.artwork)}
          size="50px"
        />
      )}
      <MetadataWrapper alignRight={props.alignRight}>
        <MiniTitle>{track.title}</MiniTitle>
        <MiniArtist>{track.artist?.name}</MiniArtist>
        <PlayedAt>
          <TimeTicker randomRange={[15, 30]}>
            {() =>
              played.playedAt && `${formatDistance(Date.now(), played.playedAt)} ago`
            }
          </TimeTicker>
        </PlayedAt>
      </MetadataWrapper>
    </TrackContainer>
  );
};

type TrackProps = BaseTrackProps & {mini?: boolean};

const Track = ({mini, ...props}: TrackProps) =>
  mini ? <MiniTrack {...props} /> : <FullTrack {...props} />;

const CurrentTrack = ({played, ...p}: React.ComponentProps<typeof Track>) => (
  <CurrentWrapper>
    <AnimatePresence>
      {played && <Track played={played} key={played.playedAt.toString()} {...p} />}
    </AnimatePresence>
  </CurrentWrapper>
);

CurrentTrack.defaultProps = {
  variants: {
    enter: {
      x: 0,
      transition: {
        when: 'beforeChildren',
        delay: 0.3,
      },
    },
  },
};

type Props = ThemeComponentProps;

const ThemeModern: React.FC<Props> = observer(({appConfig, config, history}) =>
  history.length === 0 ? null : (
    <React.Fragment>
      <CurrentTrack
        style={toJS(config.colors)}
        className="track-current"
        alignRight={config.alignRight}
        hideArtwork={config.hideArtwork}
        tags={config.tags}
        firstPlayed={history.length === 1}
        idMask={config.maskId ? appConfig.idMarker : ''}
        fontFamily={config.fontFamily}
        artworkIcon={config.artworkIcon}
        played={history[0]}
      />
      {(config.historyCount ?? 0) > 0 && history.length > 1 && (
        <RecentWrapper className="track-recents" style={toJS(config.colors)}>
          <AnimatePresence>
            {history
              .slice(1, config.historyCount ? config.historyCount + 1 : 0)
              .map(track => (
                <Track
                  mini
                  layout
                  alignRight={config.alignRight}
                  hideArtwork={config.hideArtwork}
                  played={track}
                  idMask={config.maskId ? appConfig.idMarker : ''}
                  fontFamily={config.fontFamily}
                  artworkIcon={config.artworkIcon}
                  variants={{exit: {display: 'none'}}}
                  key={`${track.playedAt}-${track.track.id}`}
                />
              ))}
          </AnimatePresence>
        </RecentWrapper>
      )}
    </React.Fragment>
  )
);

const RecentWrapper = styled('div')`
  display: flex;
  flex-direction: column;
  margin-top: 2rem;
  gap: 14px;
`;

const CurrentWrapper = styled('div')`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  > * {
    grid-column: 1;
    grid-row: 1;
  }
`;

export default {
  label: 'Track List',
  component: ThemeModern,
  colors: defaultColors,
  enabledConfigs: [
    'alignRight',
    'hideArtwork',
    'historyCount',
    'tags',
    'maskId',
    'colors',
  ],
} as ThemeDescriptor;
