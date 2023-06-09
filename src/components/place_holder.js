import React, { useState, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web'
import Tile from '../components/single_tile';
import listIcon from '../assets/icon=list.svg'
import iconDown from '../assets/icon=down.svg'


// this is for read section data and render tiles
function Section(props) {
    const [state, setState] = useState({
        sectionName: props.data.sectionName,
        ifSelectable: false,
        stack: false,
        selectedContent: [],
    })

    const rotateIcon = useSpring({
        transform: !state.stack ? 'rotate(0deg)' : 'rotate(180deg)'
    })

    const stackStyle = useSpring({
        height: state.stack ? ((Math.floor(props.data.tiles.length / 3) + 1) * (130 + 18) - 18) * props.scale : props.scale * 130
    })

    const toggleStyle = useSpring({
        width: state.ifSelectable ? props.scale * 48 : 0,
    })

    const handleStack = () => {
        let anti = !state.stack
        setState({
            ...state,
            stack: anti
        })
    }

    const handleAllSelect = () => {
        props.func(state.sectionName, false)
    }

    const handleList = () => {
        setState({
            ...state,
            ifSelectable: !state.ifSelectable
        })
        if (!state.isSelectable) {
            props.func(state.sectionName, true)
        }
    }

    const likeList = () => {
        const items = props.data.tiles.map((tile) =>
            <Tile
                order={tile.order}
                name={tile.name}
                scale={props.scale}
                image={tile.image}
                selected={tile.selected}
                isSelectable={state.ifSelectable}
                func={props.eachFunc}
                func1={props.eachFunc1}
                sectionName={state.sectionName}
                data={tile}
                />);
        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: props.scale * 18,
                }}
            >
                <animated.div
                    style={{
                        width: props.scale * 354,
                        display: 'flex',
                        flexDirection: 'row',
                        flexWrap: state.stack ? 'wrap' : 'nowrap',
                        overflowX: 'scroll',
                        overflowY: 'hidden',
                        gap: props.scale * 18,
                        ...stackStyle
                    }}
                >
                    {items}
                </animated.div>
                <div
                    onClick={handleStack}
                    style={{
                        width: props.scale * 354,
                        height: props.scale * 16,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}
                >
                    <animated.div
                        style={{
                            width: props.scale * 16,
                            height: props.scale * 16,
                            backgroundImage: `url(${iconDown})`,
                            backgroundSize: 'cover',
                            ...rotateIcon
                        }}
                    >
                    </animated.div>
                </div>
            </div>
        );
    }

    const itemList = () => {
        const items = props.data.tiles.map((tile) =>
            <Tile
                order={tile.order}
                name={tile.name}
                scale={props.scale}
                image={tile.image}
                selected={tile.selected}
                isSelectable={state.ifSelectable}
                func={props.eachFunc}
                func1={props.eachFunc1}
                sectionName={state.sectionName}
                data={tile}
            />);
        return (
            <div
                style={{
                    width: props.scale * 354,
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: props.scale * 18,
                }}
            >
                {items}
            </div>
        );
    }

    return (
        <div>
            <div
                style={{
                    width: props.scale * 354,
                    height: props.scale * 34,
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <div
                    style={{
                        height: props.scale * 22,
                        position: 'relative',
                        left: props.scale * 0,
                        border: props.selected ? '1px dashed #000000' : null,
                        borderRadius: props.scale * 2,
                        boxSizing: 'border-box',
                        padding: props.scale * 1,
                        fontFamily: 'Noto Sans SC',
                        fontWeight: 700,
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: props.scale * 16,
                        lineHeight: props.scale * 12,
                    }}
                >
                    {props.data.sectionName}
                </div>
                <div
                    style={{
                        height: props.scale * 22,
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: props.scale * 8
                    }}
                >
                    <div
                        onClick={handleList}
                        style={{
                            width: props.scale * 18,
                            height: props.scale * 18,
                            backgroundImage: `url(${listIcon})`,
                            backgroundSize: 'cover',
                        }}
                    >
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: props.scale * 8
                        }}
                    >
                        <animated.div
                            onClick={handleAllSelect}
                            style={{
                                ...toggleStyle,
                                height: props.scale * 18,
                                background: '#C9CDD4',
                                borderRadius: props.scale * 100,
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'clip'
                            }}
                        >
                            <animated.div
                                style={{
                                    width: props.scale * 48,
                                    height: props.scale * 22,
                                    background: '#C9CDD4',
                                    borderRadius: props.scale * 100,
                                    fontFamily: 'Noto Sans SC',
                                    fontWeight: 600,
                                    fontSize: props.scale * 14,
                                    textAlign: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                全选
                            </animated.div>
                        </animated.div>
                    </div>
                </div>
            </div>
            {
                props.data.type === 'like' ?
                    likeList()
                    :
                    itemList()
            }
            <animated.div
                style={{

                }}
            >

            </animated.div>
        </div>
    )
}
export default Section;